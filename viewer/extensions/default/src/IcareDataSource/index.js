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

function createIcareApi(dicomJsonConfig, servicesManager) {
  const { userAuthenticationService } = servicesManager.services;
  const implementation = {
    initialize: async ({ query, url }) => {
      if (!url && typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        url = searchParams.get('url');
      }
      if (url) {
        const evaluatedUrl = resolveConfigFetchPolicy(url, {
          allowedOrigins: dicomJsonConfig.dangerouslyAllowedOriginsForAuthenticatedEnvironments,
          userAuthenticationService,
        });
        
        let studyDetails = _store.loadedJsonMetadata.get(evaluatedUrl.normalizedUrl);
        if (!studyDetails) {
          const manifest = await fetchConfigJson(evaluatedUrl);
          studyDetails = manifest.studies?.[0];
          if (studyDetails) {
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

          // Fetch studies from custom billing API using POST
          const response = await fetch('https://icare.anikrafoundation.com:8443/icarebilling/studymasterservice/getAllNewStudy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'authorization': 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTQSIsImNyZWF0ZWQiOjE3ODI3MzM2MDAwODMsImV4cCI6MTc4MjczODYwMH0.FyqMa5Clj6nXOw9ohM3TbccU9BthXeAsBHqKVO4CUxARjSkPhkljR2jbIxGn9vY-zYzhSBXJSMGVqZNfR3qzDA'
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
