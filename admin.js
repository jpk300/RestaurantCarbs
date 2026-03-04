const datasetUrlInput = document.getElementById("datasetUrl");
const saveSourceButton = document.getElementById("saveSource");
const loadFromUrlButton = document.getElementById("loadFromUrl");
const sourceStatus = document.getElementById("sourceStatus");
const csvInput = document.getElementById("csvInput");
const uploadStatus = document.getElementById("uploadStatus");
const restaurantList = document.getElementById("restaurantList");
const saveSelectionButton = document.getElementById("saveSelection");
const selectionStatus = document.getElementById("selectionStatus");

let workingCatalog = getCatalog();

function isSpreadsheetPath(path) {
  return /\.(xls|xlsx)(\?|$)/i.test(path);
}

function renderCatalog() {
  const selected = new Set(getSelectedIds());

  if (!workingCatalog.length) {
    restaurantList.innerHTML = '<p class="help-text">No restaurants loaded yet.</p>';
    return;
  }

  restaurantList.innerHTML = workingCatalog
    .map(
      (restaurant) => `<label class="checkbox-row"><input type="checkbox" value="${restaurant.id}" ${
        selected.has(restaurant.id) ? "checked" : ""
      } /><span>${restaurant.name} (${restaurant.items.length} items)</span></label>`
    )
    .join("");
}

function loadSourceSettings() {
  const source = getDataSource();
  datasetUrlInput.value = source.datasetUrl;
}

async function parseDatasetFromResponse(response, pathHint) {
  if (isSpreadsheetPath(pathHint)) {
    const buffer = await response.arrayBuffer();
    return parseMenuStatWorkbook(buffer);
  }
  const text = await response.text();
  return parseMenuStatCsv(text);
}

function storeWorkingCatalog(catalog, statusElement) {
  workingCatalog = catalog;
  const stored = setCatalog(catalog);
  if (!stored) {
    setStatus(
      statusElement,
      `Loaded ${catalog.length} restaurants, but local cache is too large; publish still works for current session.`,
      "error"
    );
    return;
  }
  setStatus(statusElement, `Loaded ${catalog.length} restaurants.`, "success");
}

saveSourceButton.addEventListener("click", () => {
  const datasetUrl = datasetUrlInput.value.trim();
  const ok = setDataSource({ datasetUrl });
  setStatus(sourceStatus, ok ? "Dataset source saved." : "Could not save source in browser storage.", ok ? "success" : "error");
});

loadFromUrlButton.addEventListener("click", async () => {
  const url = datasetUrlInput.value.trim();

  if (!url) {
    setStatus(sourceStatus, "Provide a dataset URL first.", "error");
    return;
  }

  try {
    setStatus(sourceStatus, "Downloading dataset...");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to download dataset (${response.status}).`);
    }

    const catalog = await parseDatasetFromResponse(response, url);
    storeWorkingCatalog(catalog, sourceStatus);
    renderCatalog();
  } catch (error) {
    const message =
      error instanceof TypeError
        ? "Load failed. This is usually a browser CORS restriction from menustat.org. Download the file manually, then use Upload Dataset File below."
        : error.message;
    setStatus(sourceStatus, message, "error");
  }
});

csvInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    let catalog;
    if (isSpreadsheetPath(file.name)) {
      const buffer = await file.arrayBuffer();
      catalog = parseMenuStatWorkbook(buffer);
    } else {
      const csvText = await file.text();
      catalog = parseMenuStatCsv(csvText);
    }

    storeWorkingCatalog(catalog, uploadStatus);
    renderCatalog();
  } catch (error) {
    setStatus(uploadStatus, error.message, "error");
  }
});

saveSelectionButton.addEventListener("click", () => {
  const selectedIds = [...restaurantList.querySelectorAll('input[type="checkbox"]:checked')].map(
    (node) => node.value
  );

  const selectedRestaurants = workingCatalog.filter((restaurant) => selectedIds.includes(restaurant.id));

  const idsSaved = setSelectedIds(selectedIds);
  const publishedSaved = setPublishedCatalog(selectedRestaurants);

  if (!selectedIds.length) {
    setStatus(selectionStatus, "No restaurants selected; user page will show a prompt.", "error");
    return;
  }

  if (!publishedSaved) {
    setStatus(
      selectionStatus,
      "Selection checked, but published data could not be stored (browser storage limit). Try fewer restaurants.",
      "error"
    );
    return;
  }

  if (!idsSaved) {
    setStatus(selectionStatus, `Published ${selectedIds.length} restaurants, but could not save checkbox preferences.`, "success");
    return;
  }

  setStatus(selectionStatus, `Published ${selectedIds.length} restaurants to user page.`, "success");
});

loadSourceSettings();
renderCatalog();
