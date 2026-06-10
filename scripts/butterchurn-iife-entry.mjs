import butterchurn from 'butterchurn';
import isSupported from 'butterchurn/dist/isSupported.min.js';

const api = butterchurn?.default ?? butterchurn;

export default {
  createVisualizer: (...args) => api.createVisualizer(...args),
  isSupported,
};
