const adminUsernameInput = document.getElementById("adminUsername");
const adminPasswordInput = document.getElementById("adminPassword");
const saveAuthButton = document.getElementById("saveAuth");
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
  const state = await apiGet("/api/admin/state", { includeAdminAuth: true });
  datasetUrlInput.value = state.dataSource?.datasetUrl || "";
  workingCatalog = Array.isArray(state.catalog) ? state.catalog : [];
  selectedIds = Array.isArray(state.selectedIds) ? state.selectedIds : [];
  renderCatalog();
}

async function parseDatasetFromResponse(response, pathHint) {
  if (isSpreadsheetPath(pathHint)) {
    return parseMenuStatWorkbook(await response.arrayBuffer());
  }
  return parseMenuStatCsv(await response.text());
}

async function persistCatalog(catalog, statusElement) {
  workingCatalog = catalog;
  await apiPost("/api/catalog", { catalog }, { includeAdminAuth: true });
  setStatus(statusElement, `Loaded ${catalog.length} restaurants.`, "success");
}

saveAuthButton.addEventListener("click", async () => {
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value;

  if (!username || !password) {
    setStatus(authStatus, "Enter both username and password.", "error");
    return;
  }

  setAdminCredentials(username, password);
  try {
    await hydrate();
    setStatus(authStatus, "Admin login saved for this browser session.", "success");
  } catch (error) {
    setStatus(authStatus, "Login failed. Check username/password and try again.", "error");
  }
});

saveSourceButton.addEventListener("click", async () => {
  try {
    await apiPost("/api/source", { datasetUrl: datasetUrlInput.value.trim() }, { includeAdminAuth: true });
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
    const response = await fetch(`/api/fetch-dataset?url=${encodeURIComponent(url)}`, {
      headers: getAdminAuthHeader()
    });

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
    const payload = await apiPost("/api/publish", { selectedIds: ids }, { includeAdminAuth: true });
    selectedIds = ids;
    setStatus(selectionStatus, `Published ${payload.published} restaurants to user page.`, "success");
  } catch (error) {
    setStatus(selectionStatus, error.message, "error");
  }
});

setStatus(sourceStatus, "Enter admin login above to load current state.");
