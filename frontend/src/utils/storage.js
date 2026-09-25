export const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
  }
};

export default storage;
