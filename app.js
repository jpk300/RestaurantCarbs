const STORAGE_KEYS = {
  dataSource: "menustat_data_source",
  catalog: "menustat_restaurant_catalog",
  selectedIds: "menustat_selected_restaurant_ids",
  publishedCatalog: "menustat_published_catalog"
};

const DEFAULT_DATA_SOURCE = {
  datasetUrl: "https://www.menustat.org/uploads/1/4/1/6/141624194/ms_annual_data_2022.xls"
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getDataSource() {
  return { ...DEFAULT_DATA_SOURCE, ...readJson(STORAGE_KEYS.dataSource, {}) };
}

function setDataSource(value) {
  return writeJson(STORAGE_KEYS.dataSource, value);
}

function getCatalog() {
  return readJson(STORAGE_KEYS.catalog, []);
}

function setCatalog(catalog) {
  return writeJson(STORAGE_KEYS.catalog, catalog);
}

function getSelectedIds() {
  return readJson(STORAGE_KEYS.selectedIds, []);
}

function setSelectedIds(ids) {
  return writeJson(STORAGE_KEYS.selectedIds, ids);
}

function getPublishedCatalog() {
  return readJson(STORAGE_KEYS.publishedCatalog, []);
}

function setPublishedCatalog(catalog) {
  return writeJson(STORAGE_KEYS.publishedCatalog, catalog);
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeaders(headers) {
  return headers.map((header) => String(header || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function catalogFromRows(rows) {
  if (!rows.length) {
    throw new Error("Dataset has no rows.");
  }

  const headers = normalizeHeaders(Object.keys(rows[0]));
  const keys = Object.keys(rows[0]);

  const findColumn = (candidates) => headers.findIndex((header) => candidates.includes(header));

  const restaurantIndex = findColumn(["restaurant", "restaurantname", "chain", "chainname", "brand", "brandname"]);
  const itemIndex = findColumn(["item", "itemname", "menuitem", "foodname", "food"]);
  const carbsIndex = findColumn(["carbs", "carbohydrates", "totalcarbohydrate", "totalcarbs"]);
  const fatIndex = findColumn(["fat", "totalfat"]);
  const caloriesIndex = findColumn(["calories", "kcal", "energy"]);

  if ([restaurantIndex, itemIndex, carbsIndex, fatIndex, caloriesIndex].some((index) => index < 0)) {
    throw new Error("Dataset must include restaurant, item, carbs, fat, and calories columns.");
  }

  const byRestaurant = new Map();

  rows.forEach((row) => {
    const restaurantName = row[keys[restaurantIndex]];
    const itemName = row[keys[itemIndex]];
    const carbs = Number(row[keys[carbsIndex]]);
    const fat = Number(row[keys[fatIndex]]);
    const calories = Number(row[keys[caloriesIndex]]);

    if (!restaurantName || !itemName || [carbs, fat, calories].some((value) => Number.isNaN(value))) {
      return;
    }

    if (!byRestaurant.has(restaurantName)) {
      byRestaurant.set(restaurantName, {
        id: String(restaurantName)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        name: String(restaurantName),
        items: []
      });
    }

    byRestaurant.get(restaurantName).items.push({
      name: String(itemName),
      carbs,
      fat,
      calories
    });
  });

  const catalog = [...byRestaurant.values()].filter((entry) => entry.items.length > 0);

  if (!catalog.length) {
    throw new Error("No valid nutrition rows found in dataset.");
  }

  return catalog;
}

function parseMenuStatCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Dataset is empty or missing data rows.");
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });

  return catalogFromRows(rows);
}

function parseMenuStatWorkbook(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("Spreadsheet parser is unavailable. Reload page and try again.");
  }

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Workbook has no sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return catalogFromRows(rows);
}
