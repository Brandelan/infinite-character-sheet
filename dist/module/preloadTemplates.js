import { MODULE_ID } from "../constants.js";

export const preloadTemplates = async function () {
  const templatePaths = [
    // Add paths to "modules/infinite-character-sheet/templates"
    //`modules/${MODULE_ID}/templates/template.json`,
  ];

  return loadTemplates(templatePaths);
};
