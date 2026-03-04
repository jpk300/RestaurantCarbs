const authStatus = document.getElementById("authStatus");
const datasetUrlInput = document.getElementById("datasetUrl");
const saveSourceButton = document.getElementById("saveSource");
const loadFromUrlButton = document.getElementById("loadFromUrl");
const sourceStatus = document.getElementById("sourceStatus");
const csvInput = document.getElementById("csvInput");
const uploadStatus = document.getElementById("uploadStatus");
const restaurantList = document.getElementById("restaurantList");
const saveSelectionButton = document.getElementById("saveSelection");
const selectionStatus = document.getElementById("selectionStatus");

let workingCatalog = [];
let selectedIds = [];

function isSpreadsheetPath(path) {
  return /\.(xls|xlsx)(\?|$)/i.test(path);
}

function renderCatalog() {
  const selected = new Set(selectedIds);
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

async function hydrate() {
  const state = await apiGet("/api/admin/state");
  datasetUrlInput.value = state.dataSource?.datasetUrl || "";
  workingCatalog = Array.isArray(state.catalog) ? state.catalog : [];
  selectedIds = Array.isArray(state.selectedIds) ? state.selectedIds : [];
  renderCatalog();
  setStatus(authStatus, "Authenticated. You can now manage dataset and publishing.", "success");
}

async function parseDatasetFromResponse(response, pathHint) {
  if (isSpreadsheetPath(pathHint)) {
    return parseMenuStatWorkbook(await response.arrayBuffer());
  }
  return parseMenuStatCsv(await response.text());
}

async function persistCatalog(catalog, statusElement) {
  workingCatalog = catalog;
  await apiPost("/api/catalog", { catalog });
  setStatus(statusElement, `Loaded ${catalog.length} restaurants.`, "success");
}

saveSourceButton.addEventListener("click", async () => {
  try {
    await apiPost("/api/source", { datasetUrl: datasetUrlInput.value.trim() });
    setStatus(sourceStatus, "Dataset source saved.", "success");
  } catch (error) {
    setStatus(sourceStatus, error.message, "error");
  }
});

loadFromUrlButton.addEventListener("click", async () => {
  const url = datasetUrlInput.value.trim();
  if (!url) {
    setStatus(sourceStatus, "Provide a dataset URL first.", "error");
    return;
  }

  try {
    setStatus(sourceStatus, "Downloading dataset via server...");
    const response = await fetch(`/api/fetch-dataset?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Load failed");
    }

    const catalog = await parseDatasetFromResponse(response, url);
    await persistCatalog(catalog, sourceStatus);
    renderCatalog();
  } catch (error) {
    setStatus(sourceStatus, error.message, "error");
  }
});

csvInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    let catalog;
    if (isSpreadsheetPath(file.name)) {
      catalog = parseMenuStatWorkbook(await file.arrayBuffer());
    } else {
      catalog = parseMenuStatCsv(await file.text());
    }

    await persistCatalog(catalog, uploadStatus);
    renderCatalog();
  } catch (error) {
    setStatus(uploadStatus, error.message, "error");
  }
});

saveSelectionButton.addEventListener("click", async () => {
  const ids = [...restaurantList.querySelectorAll('input[type="checkbox"]:checked')].map((node) => node.value);

  if (!ids.length) {
    setStatus(selectionStatus, "No restaurants selected; user page will show a prompt.", "error");
    return;
  }

  try {
    const payload = await apiPost("/api/publish", { selectedIds: ids });
    selectedIds = ids;
    setStatus(selectionStatus, `Published ${payload.published} restaurants to user page.`, "success");
  } catch (error) {
    setStatus(selectionStatus, error.message, "error");
  }
});

hydrate().catch(() => {
  setStatus(authStatus, "Auth failed. Refresh this page and sign in using your container ADMIN_USERNAME/ADMIN_PASSWORD.", "error");
});
