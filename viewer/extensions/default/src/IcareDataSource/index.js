import { DicomMetadataStore, IWebApiDataSource } from '@ohif/core';
import OHIF from '@ohif/core';
import qs from 'query-string';

import getImageId from '../DicomWebDataSource/utils/getImageId';
import getDirectURL from '../utils/getDirectURL';
import { resolveConfigFetchPolicy, fetchConfigJson } from '../utils/secureConfigFetch';

const metadataProvider = OHIF.classes.MetadataProvider;

let _store = {
  studies: [], // Array of mapped study objects for the list view
  studyJsonUrlMap: new Map(), // map of studyInstanceUID to JSON URL
  loadedJsonMetadata: new Map(), // map of JSON URL to fetched study details
  studyInstanceUIDMap: new Map(), // map of URLs to studyInstanceUIDs
};

function wrapSequences(obj) {
  return Object.keys(obj).reduce(
    (acc, key) => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        acc[key] = wrapSequences(obj[key]);
      } else {
        acc[key] = obj[key];
      }
      if (key.endsWith('Sequence')) {
        acc[key] = OHIF.utils.addAccessors(acc[key]);
      }
      return acc;
    },
    Array.isArray(obj) ? [] : {}
  );
}

const isWebImageUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0];
  return cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png');
};

const transformXrayUrl = (url, modality) => {
  if (!url) return url;
  const isXray = modality === 'CR' || modality === 'DX' || modality === 'XA';
  if (!isXray) return url;

  let cleanUrl = url;
  if (cleanUrl.startsWith('dicomweb:')) {
    cleanUrl = cleanUrl.substring(9);
  } else if (cleanUrl.startsWith('wadouri:')) {
    cleanUrl = cleanUrl.substring(8);
  }

  // Replace .dcm extension with .jpg (handling query strings if any)
  const parts = cleanUrl.split('?');
  let path = parts[0];
  const query = parts[1] ? '?' + parts[1] : '';

  if (path.endsWith('.dcm')) {
    path = path.substring(0, path.length - 4) + '.jpg';
  } else if (!path.endsWith('.jpg') && !path.endsWith('.jpeg') && !path.endsWith('.png')) {
    // If it doesn't have a web image extension, append/replace to .jpg
    path = path + '.jpg'; 
  }

  return 'web:' + path + query;
};

const resolveImageUrl = (url, modality) => {
  if (!url) return url;
  const isXray = modality === 'CR' || modality === 'DX' || modality === 'XA';
  if (isXray) {
    return transformXrayUrl(url, modality);
  }

  // Non-Xray logic:
  if (url.startsWith('wadouri:')) {
    return 'dicomweb:' + url.substring(8);
  } else if (!url.startsWith('dicomweb:') && url.startsWith('http')) {
    return 'dicomweb:' + url;
  }
  return url;
};

const normalizeStudyUrls = (study) => {
  if (!study || !study.series) return;
  study.series.forEach(ser => {
    const modality = ser.Modality || ser.modality || (ser.instances?.[0]?.metadata?.Modality);
    if (ser.instances) {
      ser.instances.forEach(inst => {
        inst.url = resolveImageUrl(inst.url, modality);
      });
    }
  });
};

function createIcareApi(dicomJsonConfig, servicesManager) {
  const { userAuthenticationService } = servicesManager.services;
  const implementation = {
    initialize: async ({ query, url }) => {
      let studyGUID = null;
      if (query) {
        studyGUID = query.get('studyGUID') || query.get('studyguid');
      }
      if (!studyGUID && typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        studyGUID = searchParams.get('studyGUID') || searchParams.get('studyguid');
      }

      if (studyGUID) {
        const fakeUrl = `https://files.anikrafoundation.com/json/${studyGUID}.json`;
        const authHeader = userAuthenticationService?.getAuthorizationHeader?.();
        const authorizationToken = authHeader?.Authorization || authHeader?.authorization || 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTQSIsImNyZWF0ZWQiOjE3ODMzNDA1MTc4ODAsImV4cCI6MTc4MzM0NTUxN30.NPv5cF_yNXFN5fRUTzOZjogRdT1tZATqbtwgrKL2vPd1ZK4YH6yapVh7dShKs2c_H0ieqbZTc7RTvkHe22DWpQ'

        let studyDetails = _store.loadedJsonMetadata.get(fakeUrl);
        if (!studyDetails) {
          const response = await fetch('https://icare.anikrafoundation.com:8443/icarebilling/studymasterservice/getAllStudy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'authorization': authorizationToken
            },
            body: JSON.stringify({
              reportSearchDTO: {
                studyGUID: parseInt(studyGUID, 10),
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch study details for GUID ${studyGUID}: ${response.status}`);
          }
          const payload = await response.json();
          const s = payload.responseList?.[0];
          if (!s) {
            throw new Error(`No study found for GUID ${studyGUID}`);
          }

          studyDetails = {
            StudyInstanceUID: s.studyInstanceUID,
            StudyDate: s.studyDate ? s.studyDate.replace(/-/g, '') : '',
            StudyTime: '',
            PatientName: s.patientName || s.patient?.patientName || 'Patient',
            PatientID: s.patientID || s.patient?.patientID || 'ID',
            AccessionNumber: s.accessionNumber || '',
            ReferringPhysicianName: s.refPhysicianName || '',
            StudyDescription: s.studyDescription || '',
            series: (s.series || []).map(ser => {
              return {
                SeriesInstanceUID: ser.seriesInstanceUID,
                SeriesDescription: ser.seriesDescription || '',
                SeriesNumber: String(ser.seriesNo || 1),
                Modality: ser.modality || s.modality || 'CT',
                SliceThickness: parseFloat(ser.sliceThickness || 0.0),
                instances: (ser.images || []).map((img, imgIdx) => {
                  let sopUID = img.imageInstanceUID;
                  if (!sopUID && img.imageGUID) {
                    const parts = img.imageGUID.split('.');
                    if (parts.length > 2) {
                      sopUID = parts.slice(1, parts.length - 1).join('.');
                    } else {
                      sopUID = img.imageGUID;
                    }
                  }
                  if (!sopUID) {
                    sopUID = `sop-${imgIdx}-${Math.random()}`;
                  }

                  const modality = ser.modality || s.modality || 'CT';
                  const imageUrl = resolveImageUrl(img.dcmFileName || '', modality);

                  return {
                    metadata: {
                      StudyInstanceUID: s.studyInstanceUID,
                      SeriesInstanceUID: ser.seriesInstanceUID,
                      InstanceNumber: img.instanceNO || (imgIdx + 1),
                      SOPInstanceUID: sopUID,
                      SOPClassUID: '1.2.840.10008.5.1.4.1.1.2',
                      FrameOfReferenceUID: '',
                      ImageOrientationPatient: [1, 0, 0, 0, 1, 0],
                      ImagePositionPatient: [0, 0, parseFloat(img.sliceLocation || 0.0)],
                      PixelSpacing: [1.0, 1.0],
                      Columns: 512,
                      Rows: 512,
                      BitsAllocated: 16,
                      BitsStored: 16,
                      HighBit: 15,
                      PixelRepresentation: 0,
                      SamplesPerPixel: 1,
                      PhotometricInterpretation: 'MONOCHROME2',
                      WindowCenter: parseFloat(ser.wl || 40),
                      WindowWidth: parseFloat(ser.ww || 80),
                      Modality: ser.modality || s.modality || 'CT',
                    },
                    url: imageUrl,
                  };
                })
              };
            })
          };

          _store.loadedJsonMetadata.set(fakeUrl, studyDetails);
          _store.studyJsonUrlMap.set(studyDetails.StudyInstanceUID, fakeUrl);
          _store.studyInstanceUIDMap.set(fakeUrl, [studyDetails.StudyInstanceUID]);
        }
      } else if (url) {
        const evaluatedUrl = resolveConfigFetchPolicy(url, {
          allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
          userAuthenticationService,
        });

        let studyDetails = _store.loadedJsonMetadata.get(evaluatedUrl.normalizedUrl);
        if (!studyDetails) {
          const manifest = await fetchConfigJson(evaluatedUrl);
          studyDetails = manifest.studies?.[0];
          if (studyDetails) {
            normalizeStudyUrls(studyDetails);
            if (!studyDetails.StudyInstanceUID) {
              const firstInst = studyDetails.series?.[0]?.instances?.[0];
              studyDetails.StudyInstanceUID = firstInst?.metadata?.StudyInstanceUID;
            }
            _store.loadedJsonMetadata.set(evaluatedUrl.normalizedUrl, studyDetails);
            _store.studyJsonUrlMap.set(studyDetails.StudyInstanceUID, evaluatedUrl.normalizedUrl);
            _store.studyInstanceUIDMap.set(evaluatedUrl.normalizedUrl, [studyDetails.StudyInstanceUID]);
          }
        }
      }
    },
    query: {
      studies: {
        mapParams: () => {},
        search: async param => {
          // Map incoming UI parameters to the reportSearchDTO payload structure
          const patientName = param?.patientName || "";
          const patientID = param?.patientId || param?.mrn || "";
          const modality = param?.modality || null;
          const accessionNumber = param?.accessionNumber || "";

          const authHeader = userAuthenticationService?.getAuthorizationHeader?.();
          const authorizationToken = authHeader?.Authorization || authHeader?.authorization || 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTQSIsImNyZWF0ZWQiOjE3ODMzNDA1MTc4ODAsImV4cCI6MTc4MzM0NTUxN30.NPv5cF_yNXFN5fRUTzOZjogRdT1tZATqbtwgrKL2vPd1ZK4YH6yapVh7dShKs2c_H0ieqbZTc7RTvkHe22DWpQ';

          // Fetch studies from custom billing API using POST
          const response = await fetch('https://icare.anikrafoundation.com:8443/icarebilling/studymasterservice/getAllNewStudy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'authorization': authorizationToken
            },
            body: JSON.stringify({
              reportSearchDTO: {
                accessionNumber,
                assignedDoctorList: [],
                centerList: [],
                checkDescFlag: 0,
                checkFlag: 1,
                checkOnTAT: 0,
                checkReview: 0,
                fromDate: "Invalid Date",
                modality,
                orderBy: "",
                pageIndex: -1,
                pageSize: -1,
                patientID,
                patientName,
                reportingStatus: "New",
                roleID: 4,
                sortBy: "0",
                studyDescriptionList: [],
                studyModalityList: modality ? [modality] : [],
                studyStatusList: [],
                timeFrame: 9,
                toDate: "Invalid Date",
                userId: 1
              }
            })
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch studies list: ${response.status}`);
          }
          const payload = await response.json();
          const list = payload.responseList?.[0]?.studyList || [];

          _store.studies = list;

          // Map each study's UIDs to its JSON manifest URL
          list.forEach(study => {
            let jsonUrl = study.newViewer;
            if (!jsonUrl || !jsonUrl.startsWith('http')) {
              // Construct default url based on studyGUID or patient ID or fallback
              jsonUrl = `https://files.icareteleservices.com/json/${study.studyGUID}.json`;
            }
            _store.studyJsonUrlMap.set(study.studyInstanceUID, jsonUrl);
          });

          return list.map(study => {
            const formattedDate = study.studyDate
              ? study.studyDate.split(' ')[0].replace(/-/g, '')
              : '';
            return {
              studyInstanceUid: study.studyInstanceUID,
              date: formattedDate,
              time: '',
              accession: study.accessionNumber || '',
              mrn: study.patient?.patientID || '',
              patientName: study.patient?.patientName || '',
              patientSex: study.patient?.patientSex || study.patient?.patientGender || study.patient?.gender || study.patient?.sex || study.patientSex || study.patientGender || study.gender || study.sex || '',
              instances: Number(study.uploadedCount || study.instanceCount || 0),
              description: study.studyDescription || '',
              modalities: study.modality || '',
              referringPhysicianName: study.refPhysicianName || '',
            };
          });
        },
        processResults: () => {
          console.warn('Icare query studies processResults not implemented');
        },
      },
      series: {
        search: () => {},
      },
      instances: {
        search: () => {},
      },
    },
    retrieve: {
      directURL: params => {
        return getDirectURL(dicomJsonConfig, params);
      },
      series: {
        metadata: async ({ filters, StudyInstanceUID, madeInClient = false, customSort } = {}) => {
          if (!StudyInstanceUID) {
            throw new Error('Unable to query for SeriesMetadata without StudyInstanceUID');
          }

          // If study list is not loaded yet (e.g. direct link in fresh tab), silently fetch it first to populate mappings
          if (_store.studies.length === 0) {
            try {
              await implementation.query.studies.search();
            } catch (err) {
              console.error('Failed to fetch studies list mapping in background', err);
            }
          }

          // Retrieve the JSON URL mapped to this studyInstanceUID
          let jsonUrl = _store.studyJsonUrlMap.get(StudyInstanceUID);
          if (!jsonUrl) {
            // Fallback: try searching in our list mapping by GUID or construct fallback
            const match = _store.studies.find(s => s.studyInstanceUID === StudyInstanceUID);
            const guid = match ? match.studyGUID : StudyInstanceUID;
            jsonUrl = `https://files.icareteleservices.com/json/${guid}.json`;
          }

          const evaluatedUrl = resolveConfigFetchPolicy(jsonUrl, {
            allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
            userAuthenticationService,
          });

          let studyDetails = _store.loadedJsonMetadata.get(evaluatedUrl.normalizedUrl);
          if (!studyDetails) {
            const manifest = await fetchConfigJson(evaluatedUrl);
            studyDetails = manifest.studies?.[0];
            if (!studyDetails) {
              throw new Error(`Invalid or empty JSON manifest retrieved from ${evaluatedUrl.normalizedUrl}`);
            }
            normalizeStudyUrls(studyDetails);
            if (!studyDetails.StudyInstanceUID) {
              const firstInst = studyDetails.series?.[0]?.instances?.[0];
              studyDetails.StudyInstanceUID = firstInst?.metadata?.StudyInstanceUID;
            }
            _store.loadedJsonMetadata.set(evaluatedUrl.normalizedUrl, studyDetails);
          }

          let seriesList = studyDetails.series || [];
          if (customSort) {
            seriesList = customSort(seriesList);
          }

          const seriesSummaryMetadata = seriesList.map(series => {
            const seriesSummary = {
              StudyInstanceUID: studyDetails.StudyInstanceUID,
              ...series,
            };
            delete seriesSummary.instances;
            return seriesSummary;
          });

          DicomMetadataStore.addSeriesMetadata(seriesSummaryMetadata, madeInClient);

          const numberOfSeries = seriesList.length;
          seriesList.forEach((series, index) => {
            const instances = series.instances.map(instance => {
              const modifiedMetadata = wrapSequences(instance.metadata);
              const obj = {
                ...modifiedMetadata,
                url: instance.url,
                imageId: getImageId({ instance, config: dicomJsonConfig }),
                ...series,
                ...studyDetails,
              };
              delete obj.instances;
              delete obj.series;
              return obj;
            });

            DicomMetadataStore.addInstances(instances, madeInClient);

            if (index === numberOfSeries - 1) {
              const study = DicomMetadataStore.getStudy(StudyInstanceUID, madeInClient);
              if (study) {
                study.isLoaded = true;
              }
            }
          });
        },
      },
    },
    store: {
      dicom: () => {},
    },
    reject: {},
    deleteStudyMetadataPromise: () => {},
    getImageIdsForDisplaySet(displaySet) {
      const images = displaySet.images;
      const imageIds = [];

      if (!images) {
        return imageIds;
      }

      const { StudyInstanceUID, SeriesInstanceUID } = displaySet;
      
      // Find the study details loaded from our manifest cache
      let studyDetails;
      for (const details of _store.loadedJsonMetadata.values()) {
        if (details.StudyInstanceUID === StudyInstanceUID) {
          studyDetails = details;
          break;
        }
      }

      if (!studyDetails) {
        return imageIds;
      }

      const series = studyDetails.series.find(s => s.SeriesInstanceUID === SeriesInstanceUID) || {};

      const instanceMap = new Map();
      if (series.instances) {
        series.instances.forEach(instance => {
          if (instance?.metadata?.SOPInstanceUID) {
            const { metadata, url } = instance;
            const existingInstances = instanceMap.get(metadata.SOPInstanceUID) || [];
            existingInstances.push({ ...metadata, url });
            instanceMap.set(metadata.SOPInstanceUID, existingInstances);
          }
        });
      }

      displaySet.images.forEach(instance => {
        const NumberOfFrames = instance.NumberOfFrames || 1;
        const instances = instanceMap.get(instance.SOPInstanceUID) || [instance];
        for (let i = 0; i < NumberOfFrames; i++) {
          const imageId = getImageId({
            instance: instances[Math.min(i, instances.length - 1)],
            frame: NumberOfFrames > 1 ? i : undefined,
            config: dicomJsonConfig,
          });
          imageIds.push(imageId);
        }
      });

      return imageIds;
    },
    getStudyInstanceUIDs: ({ params, query }) => {
      const url = query.get('url');
      if (!url) {
        const studyGUID = query.get('studyGUID') || query.get('studyguid');
        if (studyGUID) {
          const fakeUrl = `https://files.anikrafoundation.com/json/${studyGUID}.json`;
          return _store.studyInstanceUIDMap.get(fakeUrl);
        }

        const studyInstanceUIDs = query.get('StudyInstanceUIDs') || query.get('studyInstanceUIDs');
        if (studyInstanceUIDs) {
          return studyInstanceUIDs.split(',');
        }
        return;
      }

      try {
        const evaluatedUrl = resolveConfigFetchPolicy(url, {
          allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
          userAuthenticationService,
        });
        return _store.studyInstanceUIDMap.get(evaluatedUrl.normalizedUrl);
      } catch {
        return;
      }
    },
    getConfig: () => dicomJsonConfig,
  };
  return IWebApiDataSource.create(implementation);
}

export { createIcareApi };
