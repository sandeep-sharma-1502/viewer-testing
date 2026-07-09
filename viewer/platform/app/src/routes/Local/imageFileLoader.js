import FileLoader from './fileLoader';

let localImageStudyUID = null;
let localImageSeriesUID = null;

const ImageFileLoader = new (class extends FileLoader {
  fileType = 'image/jpeg';
  
  loadFile(file, imageId) {
    // Return the file directly, we will construct standard imageId from it
    return Promise.resolve(file);
  }

  getDataset(image, imageId) {
    if (!localImageStudyUID) {
      localImageStudyUID = `study-${Math.random()}`;
    }
    if (!localImageSeriesUID) {
      localImageSeriesUID = `series-${Math.random()}`;
    }

    const objectUrl = URL.createObjectURL(image);
    const webImageId = `web:${objectUrl}`;

    const dataset = {
      StudyInstanceUID: localImageStudyUID,
      SeriesInstanceUID: localImageSeriesUID,
      SOPInstanceUID: `sop-${Math.random()}`,
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.7',
      InstanceNumber: 1,
      PatientName: image.name || 'Local Image',
      PatientID: 'LOCAL_IMAGE',
      StudyDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      StudyTime: '',
      AccessionNumber: '',
      ReferringPhysicianName: '',
      StudyDescription: 'Local Images Import',
      SeriesDescription: 'Imported Images',
      Modality: 'OT',
      Columns: 512,
      Rows: 512,
      BitsAllocated: 8,
      BitsStored: 8,
      HighBit: 7,
      PixelRepresentation: 0,
      SamplesPerPixel: 3,
      PhotometricInterpretation: 'RGB',
      WindowCenter: 128,
      WindowWidth: 256,
      url: webImageId,
      imageId: webImageId,
    };

    return dataset;
  }
})();

export default ImageFileLoader;
