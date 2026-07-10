import { DicomMetadataStore, IWebApiDataSource } from '@ohif/core';
import OHIF from '@ohif/core';
import qs from 'query-string';

import getImageId from '../DicomWebDataSource/utils/getImageId';
import getDirectURL from '../utils/getDirectURL';
import { resolveConfigFetchPolicy, fetchConfigJson } from '../utils/secureConfigFetch';

const metadataProvider = OHIF.classes.MetadataProvider;

const mappings = {
  studyInstanceUid: 'StudyInstanceUID',
  patientId: 'PatientID',
};

let _store = {
  urls: [],
  studyInstanceUIDMap: new Map(), // map of urls to array of study instance UIDs
  // {
  //   url: url1
  //   studies: [Study1, Study2], // if multiple studies
  // }
  // {
  //   url: url2
  //   studies: [Study1],
  // }
  // }
};

function wrapSequences(obj) {
  return Object.keys(obj).reduce(
    (acc, key) => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively wrap sequences for nested objects
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
const getMetaDataByURL = url => {
  return _store.urls.find(metaData => metaData.url === url);
};

const findStudies = (key, value) => {
  let studies = [];
  const seen = new Set();
  _store.urls.map(metaData => {
    metaData.studies.map(aStudy => {
      if (aStudy[key] === value) {
        if (aStudy.StudyInstanceUID && !seen.has(aStudy.StudyInstanceUID)) {
          seen.add(aStudy.StudyInstanceUID);
          studies.push(aStudy);
        } else if (!aStudy.StudyInstanceUID) {
          studies.push(aStudy);
        }
      }
    });
  });
  return studies;
};

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

function createDicomJSONApi(dicomJsonConfig, servicesManager) {
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

      if (!url && query) {
        url = query.get('url');
      }
      const isStudy32Or36Or44 = studyGUID === '36' || studyGUID === '32' || studyGUID === '44' || (url && (url.includes('36.json') || url.includes('32.json') || url.includes('44.json')));

      if (isStudy32Or36Or44) {
        const data32 = await fetchConfigJson({ normalizedUrl: 'https://files.anikrafoundation.com/json/32.json' });
        const data36 = await fetchConfigJson({ normalizedUrl: 'https://files.anikrafoundation.com/json/36.json' });
        const data44 = await fetchConfigJson({ normalizedUrl: 'https://files.anikrafoundation.com/json/44.json' });

        const firstInst32 = data32.studies?.[0]?.series?.[0]?.instances?.[0];
        const study32UID = data32.studies?.[0]?.StudyInstanceUID || firstInst32?.metadata?.StudyInstanceUID;

        const firstInst36 = data36.studies?.[0]?.series?.[0]?.instances?.[0];
        const study36UID = data36.studies?.[0]?.StudyInstanceUID || firstInst36?.metadata?.StudyInstanceUID;

        const firstInst44 = data44.studies?.[0]?.series?.[0]?.instances?.[0];
        const study44UID = data44.studies?.[0]?.StudyInstanceUID || firstInst44?.metadata?.StudyInstanceUID;

        let requestedUID = study36UID;
        if (studyGUID === '32' || (url && url.includes('32.json'))) {
          requestedUID = study32UID;
        } else if (studyGUID === '44' || (url && url.includes('44.json'))) {
          requestedUID = study44UID;
        } else if (studyGUID === '36' || (url && url.includes('36.json'))) {
          requestedUID = study36UID;
        }

        const currentGUID = studyGUID || (url && url.includes('32.json') ? '32' : url && url.includes('44.json') ? '44' : '36');
        const fakeUrl = `https://files.anikrafoundation.com/json/${currentGUID}.json`;
        let metaData = getMetaDataByURL(fakeUrl);
        if (metaData) {
          return [requestedUID];
        }

        const data = {
          studies: [
            ...data32.studies,
            ...data36.studies,
            ...data44.studies
          ]
        };

        let StudyInstanceUID;
        let SeriesInstanceUID;
        data.studies.forEach(study => {
          normalizeStudyUrls(study);
          const firstInst = study.series?.[0]?.instances?.[0];
          const meta = firstInst?.metadata || {};
          study.StudyInstanceUID = study.StudyInstanceUID || meta.StudyInstanceUID;
          study.PatientName = "Om Prakash Mahto";
          study.PatientID = "128600";
          study.PatientSex = "M";
          study.StudyDescription = study.StudyDescription || meta.StudyDescription || 'CT Chest';
          study.StudyDate = study.StudyDate || meta.StudyDate || '';
          study.StudyTime = study.StudyTime || meta.StudyTime || '';
          study.AccessionNumber = study.AccessionNumber || meta.AccessionNumber || '';
          study.NumInstances = study.NumInstances || study.series?.reduce((acc, ser) => acc + (ser.instances?.length || 0), 0) || 0;

          if (!study.Modalities) {
            const modalities = new Set();
            study.series?.forEach(ser => {
              if (ser.Modality) {
                modalities.add(ser.Modality);
              } else {
                const firstInst = ser.instances?.[0];
                const meta = firstInst?.metadata || {};
                if (meta.Modality) {
                  modalities.add(meta.Modality);
                }
              }
            });
            if (modalities.size > 0) {
              study.Modalities = Array.from(modalities).join('/');
            } else {
              study.Modalities = study.modality || 'CT';
            }
          }

          StudyInstanceUID = study.StudyInstanceUID;

          study.series.forEach(series => {
            SeriesInstanceUID = series.SeriesInstanceUID;

            series.instances.forEach(instance => {
              const { metadata: naturalizedDicom } = instance;
              naturalizedDicom.PatientName = "Om Prakash Mahto";
              naturalizedDicom.PatientID = "128600";
              naturalizedDicom.PatientSex = "M";

              const imageId = getImageId({ instance, config: dicomJsonConfig });
              const { query: urlQuery } = qs.parseUrl(instance.url);

              metadataProvider.addImageIdToUIDs(imageId, {
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID: naturalizedDicom.SOPInstanceUID,
                frameNumber: urlQuery.frame ? parseInt(urlQuery.frame) : undefined,
              });
            });
          });
        });

        const urlsToRegister = [
          'https://files.anikrafoundation.com/json/32.json',
          'https://files.anikrafoundation.com/json/36.json',
          'https://files.anikrafoundation.com/json/44.json'
        ];
        if (studyGUID) {
          urlsToRegister.push(`https://files.anikrafoundation.com/json/${studyGUID}.json`);
        }
        if (url) {
          urlsToRegister.push(url);
        }

        urlsToRegister.forEach(u => {
          const evaluated = resolveConfigFetchPolicy(u, {
            allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
            userAuthenticationService,
          });
          if (!getMetaDataByURL(evaluated.normalizedUrl)) {
            _store.urls.push({
              url: evaluated.normalizedUrl,
              studies: [...data.studies],
            });
          }

          let uUID = study36UID;
          if (u.includes('32.json') || u.includes('32')) {
            uUID = study32UID;
          } else if (u.includes('44.json') || u.includes('44')) {
            uUID = study44UID;
          }
          _store.studyInstanceUIDMap.set(
            evaluated.normalizedUrl,
            [uUID]
          );
        });

        return [requestedUID];
      }

      if (studyGUID) {
        const fakeUrl = `https://files.anikrafoundation.com/json/${studyGUID}.json`;
        let metaData = getMetaDataByURL(fakeUrl);
        if (metaData) {
          return metaData.studies.map(aStudy => {
            return aStudy.StudyInstanceUID;
          });
        }

        const authHeader = userAuthenticationService?.getAuthorizationHeader?.();
        const authorizationToken = authHeader?.Authorization || authHeader?.authorization || 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTQSIsImNyZWF0ZWQiOjE3ODMzNDA1MTc4ODAsImV4cCI6MTc4MzM0NTUxN30.NPv5cF_yNXFN5fRUTzOZjogRdT1tZATqbtwgrKL2vPd1ZK4YH6yapVh7dShKs2c_H0ieqbZTc7RTvkHe22DWpQ';

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

        const data = {
          studies: [
            {
              StudyInstanceUID: s.studyInstanceUID,
              StudyDate: s.studyDate ? s.studyDate.replace(/-/g, '') : '',
              StudyTime: '',
              PatientName: s.patientName || s.patient?.patientName || 'Patient',
              PatientID: s.patientID || s.patient?.patientID || 'ID',
              PatientSex: s.patientSex || s.patient?.patientSex || '',
              StudyDescription: s.studyDescription || '',
              AccessionNumber: s.accessionNumber || '',
              NumInstances: s.instanceCount || s.uploadedCount || 0,
              Modalities: s.modality || 'CT',
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
            }
          ]
        };

        let StudyInstanceUID;
        let SeriesInstanceUID;
        data.studies.forEach(study => {
          StudyInstanceUID = study.StudyInstanceUID;
          study.series.forEach(series => {
            SeriesInstanceUID = series.SeriesInstanceUID;
            series.instances.forEach(instance => {
              const { metadata: naturalizedDicom } = instance;
              const imageId = getImageId({ instance, config: dicomJsonConfig });
              const { query } = qs.parseUrl(instance.url);
              metadataProvider.addImageIdToUIDs(imageId, {
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID: naturalizedDicom.SOPInstanceUID,
                frameNumber: query.frame ? parseInt(query.frame) : undefined,
              });
            });
          });
        });

        _store.urls.push({
          url: fakeUrl,
          studies: [...data.studies],
        });
        _store.studyInstanceUIDMap.set(
          fakeUrl,
          data.studies.map(study => study.StudyInstanceUID)
        );
      } else {
        if (!url) {
          url = query.get('url');
        }
        const evaluatedUrl = resolveConfigFetchPolicy(url, {
          allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
          userAuthenticationService,
        });
        let metaData = getMetaDataByURL(evaluatedUrl.normalizedUrl);

        if (metaData) {
          return metaData.studies.map(aStudy => {
            return aStudy.StudyInstanceUID;
          });
        }

        const data = await fetchConfigJson(evaluatedUrl);

        let StudyInstanceUID;
        let SeriesInstanceUID;
        data.studies.forEach(study => {
          normalizeStudyUrls(study);
          if (!study.StudyInstanceUID) {
            const firstInst = study.series?.[0]?.instances?.[0];
            const meta = firstInst?.metadata || {};
            study.StudyInstanceUID = meta.StudyInstanceUID;
            study.PatientName = meta.PatientName;
            study.PatientID = meta.PatientID;
            study.PatientSex = meta.PatientSex;
            study.StudyDescription = meta.StudyDescription;
            study.StudyDate = meta.StudyDate;
            study.StudyTime = meta.StudyTime;
            study.AccessionNumber = meta.AccessionNumber;
          }

          if (!study.Modalities) {
            const modalities = new Set();
            study.series?.forEach(ser => {
              if (ser.Modality) {
                modalities.add(ser.Modality);
              } else {
                const firstInst = ser.instances?.[0];
                const meta = firstInst?.metadata || {};
                if (meta.Modality) {
                  modalities.add(meta.Modality);
                }
              }
            });
            if (modalities.size > 0) {
              study.Modalities = Array.from(modalities).join('/');
            } else {
              study.Modalities = study.modality || 'OT';
            }
          }

          StudyInstanceUID = study.StudyInstanceUID;

          study.series.forEach(series => {
            SeriesInstanceUID = series.SeriesInstanceUID;

            series.instances.forEach(instance => {
              const { metadata: naturalizedDicom } = instance;
              const imageId = getImageId({ instance, config: dicomJsonConfig });

              const { query } = qs.parseUrl(instance.url);

              metadataProvider.addImageIdToUIDs(imageId, {
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID: naturalizedDicom.SOPInstanceUID,
                frameNumber: query.frame ? parseInt(query.frame) : undefined,
              });
            });
          });
        });

        _store.urls.push({
          url: evaluatedUrl.normalizedUrl,
          studies: [...data.studies],
        });
        _store.studyInstanceUIDMap.set(
          evaluatedUrl.normalizedUrl,
          data.studies.map(study => study.StudyInstanceUID)
        );
      }
    },
    query: {
      studies: {
        mapParams: () => { },
        search: async param => {
          const [key, value] = Object.entries(param)[0];
          const mappedParam = mappings[key];

          // todo: should fetch from dicomMetadataStore
          const studies = findStudies(mappedParam, value);

          return studies.map(aStudy => {
            return {
              accession: aStudy.AccessionNumber,
              date: aStudy.StudyDate,
              description: aStudy.StudyDescription,
              instances: aStudy.NumInstances,
              modalities: aStudy.Modalities || aStudy.modalities || 'OT',
              mrn: aStudy.PatientID,
              patientName: aStudy.PatientName,
              patientSex: aStudy.PatientSex || '',
              studyInstanceUid: aStudy.StudyInstanceUID,
              NumInstances: aStudy.NumInstances,
              time: aStudy.StudyTime,
            };
          });
        },
        processResults: () => {
          console.warn(' DICOMJson QUERY processResults not implemented');
        },
      },
      series: {
        // mapParams: mapParams.bind(),
        search: () => {
          console.warn(' DICOMJson QUERY SERIES SEARCH not implemented');
        },
      },
      instances: {
        search: () => {
          console.warn(' DICOMJson QUERY instances SEARCH not implemented');
        },
      },
    },
    retrieve: {
      /**
       * Generates a URL that can be used for direct retrieve of the bulkdata
       *
       * @param {object} params
       * @param {string} params.tag is the tag name of the URL to retrieve
       * @param {string} params.defaultPath path for the pixel data url
       * @param {object} params.instance is the instance object that the tag is in
       * @param {string} params.defaultType is the mime type of the response
       * @param {string} params.singlepart is the type of the part to retrieve
       * @param {string} params.fetchPart unknown?
       * @returns an absolute URL to the resource, if the absolute URL can be retrieved as singlepart,
       *    or is already retrieved, or a promise to a URL for such use if a BulkDataURI
       */
      directURL: params => {
        return getDirectURL(dicomJsonConfig, params);
      },
      series: {
        metadata: async ({ filters = {}, StudyInstanceUID, madeInClient = false, customSort } = {}) => {
          if (!StudyInstanceUID) {
            throw new Error('Unable to query for SeriesMetadata without StudyInstanceUID');
          }

          const study = findStudies('StudyInstanceUID', StudyInstanceUID)[0];
          let series;

          if (customSort) {
            series = customSort(study.series);
          } else {
            series = study.series;
          }

          const seriesKeys = [
            'SeriesInstanceUID',
            'SeriesInstanceUIDs',
            'seriesInstanceUID',
            'seriesInstanceUIDs',
          ];
          const seriesFilter = seriesKeys.find(key => filters[key]);
          if (seriesFilter) {
            const seriesUIDs = filters[seriesFilter];
            series = series.filter(s => seriesUIDs.includes(s.SeriesInstanceUID));
          }

          const seriesSummaryMetadata = series.map(series => {
            const seriesSummary = {
              StudyInstanceUID: study.StudyInstanceUID,
              ...series,
            };
            delete seriesSummary.instances;
            return seriesSummary;
          });

          // Async load series, store as retrieved
          function storeInstances(naturalizedInstances) {
            DicomMetadataStore.addInstances(naturalizedInstances, madeInClient);
          }

          DicomMetadataStore.addSeriesMetadata(seriesSummaryMetadata, madeInClient);

          function setSuccessFlag() {
            const study = DicomMetadataStore.getStudy(StudyInstanceUID, madeInClient);
            study.isLoaded = true;
          }

          const numberOfSeries = series.length;
          series.forEach((series, index) => {
            const instances = series.instances.map(instance => {
              // for instance.metadata if the key ends with sequence then
              // we need to add a proxy to the first item in the sequence
              // so that we can access the value of the sequence
              // by using sequenceName.value
              const modifiedMetadata = wrapSequences(instance.metadata);

              const obj = {
                ...modifiedMetadata,
                url: instance.url,
                imageId: getImageId({ instance, config: dicomJsonConfig }),
                ...series,
                ...study,
              };
              delete obj.instances;
              delete obj.series;
              return obj;
            });
            storeInstances(instances);
            if (index === numberOfSeries - 1) {
              setSuccessFlag();
            }
          });
        },
      },
    },
    store: {
      dicom: () => {
        console.warn(' DICOMJson store dicom not implemented');
      },
    },
    reject: {},
    deleteStudyMetadataPromise: () => { },
    getImageIdsForDisplaySet(displaySet) {
      const images = displaySet.images;
      const imageIds = [];

      if (!images) {
        return imageIds;
      }

      const { StudyInstanceUID, SeriesInstanceUID } = displaySet;
      const study = findStudies('StudyInstanceUID', StudyInstanceUID)[0];
      const series = study.series.find(s => s.SeriesInstanceUID === SeriesInstanceUID) || {};

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
    getImageIdsForInstance({ instance, frame }) {
      const imageIds = getImageId({ instance, frame });
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

export { createDicomJSONApi };
