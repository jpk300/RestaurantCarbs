const restaurantSelect = document.getElementById("restaurantSelect");
const itemSelect = document.getElementById("itemSelect");
const nutritionGrid = document.getElementById("nutritionGrid");
const carbsValue = document.getElementById("carbsValue");
const fatValue = document.getElementById("fatValue");
const caloriesValue = document.getElementById("caloriesValue");
const placeholder = document.querySelector(".placeholder");
const userStatus = document.getElementById("userStatus");

let restaurants = [];

function resetNutrition() {
  nutritionGrid.classList.add("hidden");
  placeholder.textContent = "Select a restaurant and item to view nutrition details.";
}

function loadVisibleRestaurants() {
  const catalog = getCatalog();
  const selected = new Set(getSelectedIds());
  restaurants = catalog.filter((restaurant) => selected.has(restaurant.id));

  restaurantSelect.innerHTML = '<option value="">Select a restaurant…</option>';

  restaurants.forEach((restaurant, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${restaurant.name} (${restaurant.items.length} items)`;
    restaurantSelect.appendChild(option);
  });

  if (!restaurants.length) {
    setStatus(userStatus, "No restaurants are available yet. Ask admin to configure MenuStat and publish selections.", "error");
  } else {
    setStatus(userStatus, `Showing ${restaurants.length} curated restaurants.`, "success");
  }
}

restaurantSelect.addEventListener("change", (event) => {
  const value = event.target.value;
  itemSelect.innerHTML = '<option value="">Select a menu item…</option>';
  resetNutrition();

  if (value === "") {
    itemSelect.disabled = true;
    return;
  }

  restaurants[Number(value)].items.forEach((item, itemIndex) => {
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

  const item = restaurants[Number(restaurantIndex)].items[Number(itemIndex)];
  carbsValue.textContent = `${item.carbs} g`;
  fatValue.textContent = `${item.fat} g`;
  caloriesValue.textContent = `${item.calories}`;
  placeholder.textContent = `${restaurants[Number(restaurantIndex)].name} • ${item.name}`;
  nutritionGrid.classList.remove("hidden");
});

loadVisibleRestaurants();
resetNutrition();
