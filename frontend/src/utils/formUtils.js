/**
 * Utility functions for form manipulation and nested object handling
 */

/**
 * Gets a value from a nested object using a dot-separated path or array notation
 * @param {object} obj - The object to traverse
 * @param {string} path - The path to the value (e.g., "user.profile.name" or "items[0].name")
 * @returns {*} The value at the path or undefined if not found
 */
export const getNestedValue = (obj, path) => {
  if (!path) return obj;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (part.includes('[')) {
      const arrName = part.substring(0, part.indexOf('['));
      const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

      if (!current[arrName] || !Array.isArray(current[arrName]) || !current[arrName][arrIdx]) {
        return undefined;
      }

      current = current[arrName][arrIdx];
    } else {
      if (!current[part]) return undefined;
      current = current[part];
    }
  }

  return current;
};

/**
 * Sets a value in a nested object using a dot-separated path or array notation
 * @param {object} obj - The object to modify
 * @param {string} path - The path where to set the value
 * @param {*} value - The value to set
 */
export const setNestedValue = (obj, path, value) => {
  if (!path) return;

  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (part.includes('[')) {
      const arrName = part.substring(0, part.indexOf('['));
      const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

      if (!current[arrName]) current[arrName] = [];
      if (!current[arrName][arrIdx]) current[arrName][arrIdx] = {};

      current = current[arrName][arrIdx];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('[')) {
    const arrName = lastPart.substring(0, lastPart.indexOf('['));
    const arrIdx = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));

    if (!current[arrName]) current[arrName] = [];
    current[arrName][arrIdx] = value;
  } else {
    current[lastPart] = value;
  }
};

/**
 * Creates an empty object based on a template object, preserving structure but resetting values
 * @param {*} template - The template to base the empty object on
 * @returns {*} An empty object with the same structure as the template
 */
export const createEmptyObjectFromTemplate = (template) => {
  if (typeof template !== 'object' || template === null) {
    return typeof template === 'string' ? '' :
           typeof template === 'number' ? 0 :
           typeof template === 'boolean' ? false :
           null;
  }

  if (Array.isArray(template)) {
    return [];
  }

  // Copy structure but reset values
  return Object.keys(template).reduce((obj, k) => {
    if (Array.isArray(template[k])) {
      obj[k] = [];
    } else if (typeof template[k] === 'object' && template[k] !== null) {
      obj[k] = {};
    } else if (typeof template[k] === 'boolean') {
      obj[k] = false;
    } else if (typeof template[k] === 'number') {
      obj[k] = 0;
    } else {
      obj[k] = '';
    }
    return obj;
  }, {});
};

/**
 * Recursively initializes missing arrays in objects, particularly for QCM options
 * @param {object} obj - The object to initialize
 * @returns {object} The initialized object
 */
export const initializeArrays = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  // Copy the object to avoid modifying the original directly
  const newObj = Array.isArray(obj) ? [...obj] : {...obj};

  // Initialize options array for objects that have 'question' but no 'options'
  if (newObj.hasOwnProperty('question') && !newObj.hasOwnProperty('options')) {
    console.log("Initialisation du tableau 'options' pour:", newObj);
    newObj.options = [];
  }

  // Recursively apply to nested objects
  Object.keys(newObj).forEach(key => {
    if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = initializeArrays(newObj[key]);
    }
  });

  return newObj;
};

/**
 * Safely gets an array from an object property, initializing it if it doesn't exist or isn't an array
 * @param {object} obj - The object to get the array from
 * @param {string} key - The key of the array property
 * @returns {Array} The array, guaranteed to be initialized
 */
export const getOrCreateArray = (obj, key) => {
  if (!obj[key] || !Array.isArray(obj[key])) {
    obj[key] = [];
  }
  return obj[key];
};

/**
 * Safely gets an object from an object property, initializing it if it doesn't exist or isn't an object
 * @param {object} obj - The object to get the object from
 * @param {string} key - The key of the object property
 * @returns {object} The object, guaranteed to be initialized
 */
export const getOrCreateObject = (obj, key) => {
  if (!obj[key] || typeof obj[key] !== 'object' || Array.isArray(obj[key])) {
    obj[key] = {};
  }
  return obj[key];
};