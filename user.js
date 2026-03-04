const restaurantSelect = document.getElementById("restaurantSelect");
const categorySelect = document.getElementById("categorySelect");
const itemSelect = document.getElementById("itemSelect");
const nutritionGrid = document.getElementById("nutritionGrid");
const carbsValue = document.getElementById("carbsValue");
const fatValue = document.getElementById("fatValue");
const caloriesValue = document.getElementById("caloriesValue");
const placeholder = document.querySelector(".placeholder");
const userStatus = document.getElementById("userStatus");

let restaurants = [];
let filteredItems = [];

function resetNutrition() {
  nutritionGrid.classList.add("hidden");
  placeholder.textContent = "Select a restaurant, category, and item to view nutrition details.";
}

function resetCategoryAndItems() {
  categorySelect.innerHTML = '<option value="">Select a category…</option>';
  categorySelect.disabled = true;
  itemSelect.innerHTML = '<option value="">Select a menu item…</option>';
  itemSelect.disabled = true;
  filteredItems = [];
}

function loadVisibleRestaurants() {
  const published = getPublishedCatalog();

  if (published.length) {
    restaurants = published;
  } else {
    const catalog = getCatalog();
    const selected = new Set(getSelectedIds());
    restaurants = catalog.filter((restaurant) => selected.has(restaurant.id));
  }

  restaurantSelect.innerHTML = '<option value="">Select a restaurant…</option>';

  restaurants.forEach((restaurant, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${restaurant.name} (${restaurant.items.length} items)`;
    restaurantSelect.appendChild(option);
  });

  if (!restaurants.length) {
    setStatus(
      userStatus,
      "No restaurants are available yet. Ask admin to load a MenuStat file and publish selections.",
      "error"
    );
  } else {
    setStatus(userStatus, `Showing ${restaurants.length} curated restaurants.`, "success");
  }
}

restaurantSelect.addEventListener("change", (event) => {
  const value = event.target.value;
  resetCategoryAndItems();
  resetNutrition();

  if (value === "") {
    return;
  }

  const selectedRestaurant = restaurants[Number(value)];
  const categories = [...new Set(selectedRestaurant.items.map((item) => item.category || "Uncategorized"))].sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  categorySelect.disabled = false;
});

categorySelect.addEventListener("change", (event) => {
  const restaurantIndex = restaurantSelect.value;
  const category = event.target.value;
  itemSelect.innerHTML = '<option value="">Select a menu item…</option>';
  itemSelect.disabled = true;
  filteredItems = [];
  resetNutrition();

  if (restaurantIndex === "" || category === "") {
    return;
  }

  filteredItems = restaurants[Number(restaurantIndex)].items.filter(
    (item) => (item.category || "Uncategorized") === category
  );

  filteredItems.forEach((item, itemIndex) => {
    const option = document.createElement("option");
    option.value = String(itemIndex);
    option.textContent = item.name;
    itemSelect.appendChild(option);
  });

  itemSelect.disabled = false;
});

itemSelect.addEventListener("change", (event) => {
  const restaurantIndex = restaurantSelect.value;
  const itemIndex = event.target.value;

  if (restaurantIndex === "" || itemIndex === "") {
    resetNutrition();
    return;
  }

  const item = filteredItems[Number(itemIndex)];
  carbsValue.textContent = `${item.carbs} g`;
  fatValue.textContent = `${item.fat} g`;
  caloriesValue.textContent = `${item.calories}`;
  placeholder.textContent = `${restaurants[Number(restaurantIndex)].name} • ${item.category || "Uncategorized"} • ${item.name}`;
  nutritionGrid.classList.remove("hidden");
});

loadVisibleRestaurants();
resetCategoryAndItems();
resetNutrition();
