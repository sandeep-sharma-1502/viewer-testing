import { volumeLoader, imageLoader, metaData } from '@cornerstonejs/core';
import {
  cornerstoneStreamingImageVolumeLoader,
  cornerstoneStreamingDynamicImageVolumeLoader,
} from '@cornerstonejs/core/loaders';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import { errorHandler, utils } from '@ohif/core';

const { registerVolumeLoader } = volumeLoader;

function loadWebImage(imageId) {
  const cleanUrl = imageId.replace(/^web:/, '');

  return {
    promise: new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = cleanUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        const rgbaData = imageData.data;
        const numPixels = img.naturalWidth * img.naturalHeight;

        // Convert RGBA to 1-channel Grayscale (Luminance)
        const grayscaleData = new Uint8Array(numPixels);
        let rgbaIdx = 0;
        for (let i = 0; i < numPixels; i++) {
          grayscaleData[i] = Math.round(
            0.299 * rgbaData[rgbaIdx] +
            0.587 * rgbaData[rgbaIdx + 1] +
            0.114 * rgbaData[rgbaIdx + 2]
          );
          rgbaIdx += 4;
        }

        // Dynamically update the registered metadata in the provider to match the image dimensions and monochrome channel count
        const instance = metaData.get('instance', imageId);
        if (instance) {
          instance.Rows = img.naturalHeight;
          instance.Columns = img.naturalWidth;
          instance.SamplesPerPixel = 1;
          instance.PhotometricInterpretation = 'MONOCHROME2';
          instance.BitsAllocated = 8;
          instance.BitsStored = 8;
          instance.HighBit = 7;
          instance.PixelRepresentation = 0;
        }

        const cornerstoneImage = {
          imageId,
          minPixelValue: 0,
          maxPixelValue: 255,
          slope: 1,
          intercept: 0,
          windowCenter: 128,
          windowWidth: 256,
          getPixelData: () => grayscaleData,
          rows: img.naturalHeight,
          columns: img.naturalWidth,
          height: img.naturalHeight,
          width: img.naturalWidth,
          color: false,
          rgba: false,
          numPixels,
          sizeInBytes: grayscaleData.byteLength,
          columnPixelSpacing: 1,
          rowPixelSpacing: 1,
        };

        resolve(cornerstoneImage);
      };
      img.onerror = (err) => {
        reject(err);
      };
    }),
    cancelFn: undefined,
  };
}

export default function initWADOImageLoader(
  userAuthenticationService,
  appConfig,
  extensionManager
) {
  registerVolumeLoader('cornerstoneStreamingImageVolume', cornerstoneStreamingImageVolumeLoader);

  registerVolumeLoader(
    'cornerstoneStreamingDynamicImageVolume',
    cornerstoneStreamingDynamicImageVolumeLoader
  );

  imageLoader.registerImageLoader('web', loadWebImage);

  dicomImageLoader.init({
    maxWebWorkers: Math.min(
      Math.max(navigator.hardwareConcurrency - 1, 1),
      appConfig.maxNumberOfWebWorkers
    ),
    beforeSend: function (xhr) {
      //TODO should be removed in the future and request emitted by DicomWebDataSource
      const sourceConfig = extensionManager.getActiveDataSource()?.[0].getConfig() ?? {};
      const headers = userAuthenticationService.getAuthorizationHeader();
      const acceptHeader = utils.generateAcceptHeader(
        sourceConfig.acceptHeader,
        sourceConfig.requestTransferSyntaxUID,
        sourceConfig.omitQuotationForMultipartRequest
      );

      const xhrRequestHeaders = {
        Accept: acceptHeader,
      };

      if (headers) {
        Object.assign(xhrRequestHeaders, headers);
      }

      return xhrRequestHeaders;
    },
    errorInterceptor: error => {
      const handler = errorHandler.getHTTPErrorHandler();
      if (handler) {
        handler(error);
      }
    },
  });
}

export function destroy() {
  console.debug('Destroying WADO Image Loader');
}

