const nutritionGrid = document.getElementById("nutritionGrid");
const carbsValue = document.getElementById("carbsValue");
const fatValue = document.getElementById("fatValue");
const caloriesValue = document.getElementById("caloriesValue");
const placeholder = document.querySelector(".placeholder");
const userStatus = document.getElementById("userStatus");

let restaurants = [];
let filteredItems = [];
let selectedRestaurantIndex = null;
let selectedCategory = null;

function resetNutrition() {
  nutritionGrid.classList.add("hidden");
  placeholder.textContent = "Select a restaurant, category, and item to view nutrition details.";
}

function createDropdown(root, placeholderText) {
  root.innerHTML = `
    <button type="button" class="dropdown-trigger" aria-expanded="false">${placeholderText}</button>
    <div class="dropdown-panel hidden">
      <input type="text" class="dropdown-search" placeholder="Search..." />
      <div class="dropdown-options"></div>
    </div>
  `;

  const trigger = root.querySelector(".dropdown-trigger");
  const panel = root.querySelector(".dropdown-panel");
  const search = root.querySelector(".dropdown-search");
  const optionsContainer = root.querySelector(".dropdown-options");
  const hostCard = root.closest(".card");

  let options = [];
  let selected = null;
  let onChange = () => {};
  let disabled = false;

  function close() {
    panel.classList.add("hidden");
    root.classList.remove("open");
    if (hostCard) hostCard.classList.remove("dropdown-host-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function open() {
    if (disabled) return;
    panel.classList.remove("hidden");
    root.classList.add("open");
    if (hostCard) hostCard.classList.add("dropdown-host-open");
    trigger.setAttribute("aria-expanded", "true");
    search.focus();
  }

  function render(filterText = "") {
    const q = filterText.trim().toLowerCase();
    const visible = options.filter((opt) => opt.label.toLowerCase().includes(q));

    if (!visible.length) {
      optionsContainer.innerHTML = '<p class="dropdown-empty">No matches found.</p>';
      return;
    }

    optionsContainer.innerHTML = visible
      .map(
        (opt) => `<button type="button" class="dropdown-option ${selected === opt.value ? "selected" : ""}" data-value="${String(
          opt.value
        )}">${opt.label}</button>`
      )
      .join("");
  }

  trigger.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) open();
    else close();
  });

  search.addEventListener("input", () => render(search.value));

  optionsContainer.addEventListener("click", (event) => {
    const btn = event.target.closest(".dropdown-option");
    if (!btn) return;
    const value = btn.dataset.value;
    const picked = options.find((opt) => String(opt.value) === value);
    if (!picked) return;

    selected = picked.value;
    trigger.textContent = picked.label;
    render(search.value);
    close();
    onChange(picked);
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) close();
  });

  return {
    setOptions(nextOptions) {
      options = nextOptions;
      selected = null;
      trigger.textContent = placeholderText;
      search.value = "";
      render();
    },
    setDisabled(nextDisabled) {
      disabled = nextDisabled;
      trigger.disabled = nextDisabled;
      if (nextDisabled) close();
    },
    onChange(handler) {
      onChange = handler;
    }
  };
}

const restaurantDropdown = createDropdown(document.getElementById("restaurantDropdown"), "Select a restaurant…");
const categoryDropdown = createDropdown(document.getElementById("categoryDropdown"), "Select a category…");
const itemDropdown = createDropdown(document.getElementById("itemDropdown"), "Select a menu item…");

categoryDropdown.setDisabled(true);
itemDropdown.setDisabled(true);

restaurantDropdown.onChange((picked) => {
  selectedRestaurantIndex = Number(picked.value);
  selectedCategory = null;
  filteredItems = [];
  resetNutrition();

  const selectedRestaurant = restaurants[selectedRestaurantIndex];
  const categories = [...new Set(selectedRestaurant.items.map((item) => item.category || "Uncategorized"))].sort();

  categoryDropdown.setOptions(categories.map((category) => ({ value: category, label: category })));
  categoryDropdown.setDisabled(false);
  itemDropdown.setOptions([]);
  itemDropdown.setDisabled(true);
});

categoryDropdown.onChange((picked) => {
  selectedCategory = picked.value;
  filteredItems = restaurants[selectedRestaurantIndex].items.filter(
    (item) => (item.category || "Uncategorized") === selectedCategory
  );

  itemDropdown.setOptions(
    filteredItems.map((item, index) => ({
      value: String(index),
      label: item.name
    }))
  );
  itemDropdown.setDisabled(false);
  resetNutrition();
});

itemDropdown.onChange((picked) => {
  const item = filteredItems[Number(picked.value)];
  carbsValue.textContent = `${item.carbs} g`;
  fatValue.textContent = `${item.fat} g`;
  caloriesValue.textContent = `${item.calories}`;
  placeholder.textContent = `${restaurants[selectedRestaurantIndex].name} • ${item.category || "Uncategorized"} • ${item.name}`;
  nutritionGrid.classList.remove("hidden");
});

(async function init() {
  try {
    const state = await apiGet("/api/state");
    restaurants = Array.isArray(state.publishedCatalog) ? state.publishedCatalog : [];

    restaurantDropdown.setOptions(
      restaurants.map((restaurant, index) => ({
        value: String(index),
        label: `${restaurant.name} (${restaurant.items.length} items)`
      }))
    );

    if (!restaurants.length) {
      setStatus(userStatus, "No restaurants are published yet. Ask admin to publish selections.", "error");
      restaurantDropdown.setDisabled(true);
    } else {
      setStatus(userStatus, `Showing ${restaurants.length} curated restaurants.`, "success");
      restaurantDropdown.setDisabled(false);
    }

    resetNutrition();
  } catch (error) {
    setStatus(userStatus, error.message, "error");
  }
})();
