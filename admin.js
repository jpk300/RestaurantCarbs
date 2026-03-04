const datasetUrlInput = document.getElementById("datasetUrl");
const saveSourceButton = document.getElementById("saveSource");
const loadFromUrlButton = document.getElementById("loadFromUrl");
const sourceStatus = document.getElementById("sourceStatus");
const csvInput = document.getElementById("csvInput");
const uploadStatus = document.getElementById("uploadStatus");
const restaurantList = document.getElementById("restaurantList");
const saveSelectionButton = document.getElementById("saveSelection");
const selectionStatus = document.getElementById("selectionStatus");

function isSpreadsheetPath(path) {
  return /\.(xls|xlsx)(\?|$)/i.test(path);
}

function renderCatalog() {
  const catalog = getCatalog();
  const selected = new Set(getSelectedIds());

  if (!catalog.length) {
    restaurantList.innerHTML = '<p class="help-text">No restaurants loaded yet.</p>';
    return;
  }

  restaurantList.innerHTML = catalog
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

saveSourceButton.addEventListener("click", () => {
  const datasetUrl = datasetUrlInput.value.trim();
  setDataSource({ datasetUrl });
  setStatus(sourceStatus, "Dataset source saved.", "success");
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
    setCatalog(catalog);
    renderCatalog();
    setStatus(sourceStatus, `Loaded ${catalog.length} restaurants from URL.`, "success");
  } catch (error) {
    setStatus(sourceStatus, error.message, "error");
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

    setCatalog(catalog);
    renderCatalog();
    setStatus(uploadStatus, `Loaded ${catalog.length} restaurants from ${file.name}.`, "success");
  } catch (error) {
    setStatus(uploadStatus, error.message, "error");
  }
});

saveSelectionButton.addEventListener("click", () => {
  const selectedIds = [...restaurantList.querySelectorAll('input[type="checkbox"]:checked')].map(
    (node) => node.value
  );

  setSelectedIds(selectedIds);

  if (!selectedIds.length) {
    setStatus(selectionStatus, "No restaurants selected; user page will show a prompt.", "error");
    return;
  }

  setStatus(selectionStatus, `Published ${selectedIds.length} restaurants to user page.`, "success");
});

loadSourceSettings();
renderCatalog();
