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

function renderRestaurants() {
  restaurantSelect.innerHTML = '<option value="">Select a restaurant…</option>';
  restaurants.forEach((restaurant, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${restaurant.name} (${restaurant.items.length} items)`;
    restaurantSelect.appendChild(option);
  });

  if (!restaurants.length) {
    setStatus(userStatus, "No restaurants are published yet. Ask admin to publish selections.", "error");
  } else {
    setStatus(userStatus, `Showing ${restaurants.length} curated restaurants.`, "success");
  }
}

restaurantSelect.addEventListener("change", (event) => {
  resetCategoryAndItems();
  resetNutrition();
  if (event.target.value === "") return;

  const selectedRestaurant = restaurants[Number(event.target.value)];
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

  if (restaurantIndex === "" || category === "") return;

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

(async function init() {
  try {
    const state = await apiGet("/api/state");
    restaurants = Array.isArray(state.publishedCatalog) ? state.publishedCatalog : [];
    renderRestaurants();
    resetCategoryAndItems();
    resetNutrition();
  } catch (error) {
    setStatus(userStatus, error.message, "error");
  }
})();
