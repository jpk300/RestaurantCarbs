async function apiGet(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) element.classList.add(type);
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

function catalogFromRows(rows) {
  if (!rows.length) throw new Error("Dataset has no rows.");

  const keys = Object.keys(rows[0]);
  const normalizedByKey = keys.map((key) => ({ key, normalized: String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "") }));

  const findKey = (candidates) => {
    const hit = normalizedByKey.find((entry) => candidates.includes(entry.normalized));
    return hit ? hit.key : null;
  };

  const restaurantKey = findKey(["restaurant", "restaurantname", "chain", "chainname", "brand", "brandname"]);
  const itemKey = findKey(["item", "itemname", "menuitem", "foodname", "food"]);
  const categoryKey = findKey(["foodcategory", "category", "foodgroup", "menucategory", "subcategory"]);
  const carbsKey = findKey(["carbs", "carbohydrates", "totalcarbohydrate", "totalcarbs"]);
  const fatKey = findKey(["fat", "totalfat"]);
  const caloriesKey = findKey(["calories", "kcal", "energy"]);

  if (!restaurantKey || !itemKey || !carbsKey || !fatKey || !caloriesKey) {
    throw new Error("Dataset must include restaurant, item, carbs, fat, and calories columns.");
  }

  const byRestaurant = new Map();

  rows.forEach((row) => {
    const restaurantName = row[restaurantKey];
    const itemName = row[itemKey];
    const categoryName = categoryKey ? row[categoryKey] : "";
    const carbs = Number(row[carbsKey]);
    const fat = Number(row[fatKey]);
    const calories = Number(row[caloriesKey]);

    if (!restaurantName || !itemName || [carbs, fat, calories].some((v) => Number.isNaN(v))) return;

    if (!byRestaurant.has(restaurantName)) {
      byRestaurant.set(restaurantName, {
        id: String(restaurantName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        name: String(restaurantName),
        items: []
      });
    }

    byRestaurant.get(restaurantName).items.push({
      name: String(itemName),
      category: String(categoryName || "Uncategorized"),
      carbs,
      fat,
      calories
    });
  });

  const catalog = [...byRestaurant.values()].filter((entry) => entry.items.length > 0);
  if (!catalog.length) throw new Error("No valid nutrition rows found in dataset.");
  return catalog;
}

function parseMenuStatCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Dataset is empty or missing data rows.");

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
  if (typeof XLSX === "undefined") throw new Error("Spreadsheet parser is unavailable.");
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return catalogFromRows(rows);
}
