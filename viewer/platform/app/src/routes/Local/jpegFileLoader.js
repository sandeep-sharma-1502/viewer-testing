import FileLoader from './fileLoader';

const JPEGFileLoader = new (class extends FileLoader {
  fileType = 'image/jpeg';
  objectUrls = new Set();

  loadFile(file, imageId) {
    // Generate a temporary browser object URL for the local file
    const objectUrl = URL.createObjectURL(file);
    this.objectUrls.add(objectUrl);
    // Return a virtual imageId under the 'web' scheme
    return Promise.resolve(`web:${objectUrl}`);
  }

  clear() {
    this.objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to revoke object URL:', err);
      }
    });
    this.objectUrls.clear();
  }

  getDataset(image, imageId) {
    const dataset = {
      StudyInstanceUID: 'local-study-uid',
      SeriesInstanceUID: 'local-series-uid',
      SOPInstanceUID: 'local-instance-uid-' + Math.random().toString(36).substring(7),
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.7', // Secondary Capture Image Storage
      Columns: 512,
      Rows: 512,
      Modality: 'CR', // Default to CR (X-Ray) for these image drops
      url: image, // This is the virtual imageId 'web:blob:...'
    };
    return dataset;
  }
})();

export default JPEGFileLoader;
