// Import required modules
import { checkUserAuthentication, signOut } from "./authGuard.js";

import {
  getCategories,
  getAllProducts,
  normalizeProduct,
  isPriceChanged,
  calculateNewPrice,
  savePriceChanges,
} from "./priceService.js";

import {
  displayDepartments,
  updateHeaderStatus,
  updateTabsCount,
  displayProducts,
  updatePagination,
  displayDepartmentPreview,
} from "./priceUI.js";

// Sample global statue variables
let currentUser = null;
let allCategories = [];
let allProducts = [];
let filteredProucts = [];

let activeTabs = "all"; // all  , changed,  noPhoto
let selectedDepartment = "all";
let searchQuery = "";
let sortColumn = "";
let sortDirection = "asc";

let currentPage = 1;
let pageSize = 25;
let searchTimer = null;

//global variables
const logOutBtn = document.getElementById("logOut-btn");
const discardBtn = document.getElementById("discard-btn");
const saveBtn = document.getElementById("save-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const searchInput = document.getElementById("search-input");
const filterDepartment = document.getElementById("filter-department");

const tabButtons = document.querySelectorAll(".tab-btn");
const sortHeaders = document.querySelectorAll("th.sortable");
const productTBody = document.getElementById("products-tbody");

const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");

const bulkDepartment = document.getElementById("bulk-department");
const bulkPercentage = document.getElementById("bulk-percentage");
const bulkRound = document.getElementById("bulk-round");

const applyDeptBtn = document.getElementById("apply-department-btn");

// Initialize price dashboard
async function InitializePriceDashboard() {
  try {
    //checked logged-in user -- also used while saving changes
    currentUser = await checkUserAuthentication();

    //load categories and populate dropdown
    allCategories = await getCategories();
    displayDepartments(allCategories);

    //load products and formate them for fast searching
    const rawProducts = await getAllProducts();
    allProducts = rawProducts.map((row) =>
      normalizeProduct(row, allCategories),
    );

    //Highlight "all products" tabs by default
    tabButtons[0]?.classList.add("active");

    // Display table and department preview
    applyAllTogether();
    updateBulkPreview();

    console.log("Price Dashboard initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize the price dashboard:", error);
  }
}

// count changed and no-photo products and update top-bar
function refreshCounts() {
  const totalCount = allProducts.length;
  const changedCount = allProducts.filter((p) => isPriceChanged(p)).length;
  const noPhotoCount = allProducts.filter((p) => !p.hasPhoto).length;

  updateHeaderStatus(totalCount, changedCount);
  updateTabsCount(totalCount, changedCount, noPhotoCount);
}

// Filter prodcuts by Tab, Department and Search
function filterProductsList() {
  const search = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

  filteredProucts = allProducts.filter((product) => {
    // Filter by tabs
    if (activeTabs === "changed" && !isPriceChanged(product)) {
      return false;
    }

    if (activeTabs === "nophoto" && product.hasPhoto) {
      return false;
    }

    // Filter by department
    if (
      selectedDepartment !== "all" &&
      product.categoryId !== selectedDepartment
    ) {
      return false;
    }

    // Fast search -- check if every typed is inside product.searchText
    if (search.length > 0) {
      const matchesAllWords = search.every((word) =>
        product.searchText.includes(word),
      );

      if (!matchesAllWords) {
        return false;
      }
    }

    return true;
  });
}

// Sort Products List
function sortProductsList() {
  if (!sortColumn) {
    return;
  }

  const multiplier = sortDirection === "asc" ? 1 : -1;

  filteredProucts.sort((a, b) => {
    if (sortColumn === "title") {
      return a.title.localeCompare(b.title) * multiplier;
    }

    if (sortColumn === "department") {
      return a.department.localeCompare(b.department) * multiplier;
    }

    if (sortColumn === "price") {
      return (a.currentPrice - b.currentPrice) * multiplier;
    }

    if (sortColumn === "change") {
      const changeA = a.currentPrice - a.oldPrice;
      const changeB = b.currentPrice - b.oldPrice;
      return (changeA - changeB) * multiplier;
    }

    return 0;
  });
}

// Slice currentPage (25 items) and update UI  -- pagination
function renderCurrentPage() {
  const totalFiltered = filteredProucts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const productOnPage = filteredProucts.slice(startIndex, endIndex);

  displayProducts(productOnPage, totalFiltered);
  updatePagination(currentPage, pageSize, totalFiltered);
}

// Run 'counts' , 'filter', 'sort' and 'render' together
function applyAllTogether() {
  refreshCounts();
  filterProductsList();
  sortProductsList();
  renderCurrentPage();
}

// Update right-side "Change a department" card preview
function updateBulkPreview() {
  const deptId = bulkDepartment.value;
  const percentage = parseFloat(bulkPercentage.value) || 0;
  const roundOption = bulkRound.value;

  const deptProducts = allProducts.filter((p) => p.categoryId === deptId);

  displayDepartmentPreview(deptProducts, percentage, roundOption);
}

// ----- EVENT LISTNERS -----

// Search input  -- waits 150 ms after typing stops so search becomes faster
searchInput.addEventListener("input", (event) =>{
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        searchQuery = event.target.value; 
        currentPage = 1;
        applyAllTogether();
    }, 150);

});

// Department Filter Dropdown
filterDepartment.addEventListener("change", (event) => {
    selectedDepartment = event.target.value;
    currentPage = 1;
    applyAllTogether();
});

// Filter tabs (All products, Changed, No Photos)
tabButtons.forEach((button)=> {

    button.addEventListener("click", () => {

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        activeTabs = button.dataset.tab;
        currentPage = 1;
        applyAllTogether();

    });
});

// Column sorting headers
sortHeaders.forEach((header) => {
   
    header.addEventListener("click", () => {

        const column = header.dataset.sort;

        if(sortColumn === column){
            sortDirection = sortDirection === "asc" ? "dec" : "asc" ;
        }else{
            sortColumn = column;
            sortDirection = "asc"
        }

        applyAllTogether();

    });
});

// Edit a product price in a table
productTBody.addEventListener("change", (event) => {

    if(!event.target.classList.contains("price-input")) return;

    const productId = Number(event.target.dataset.id);
    const newPrice = parseFloat(event.target.value);
    const product = allProducts.find( (p) => p.id === productId );

    if(product && !isNaN(newPrice) && newPrice >= 0){
        product.currentPrice = Number(newPrice.toFixed(2));
    }

    applyAllTogether();
    updateBulkPreview();
    
});

productTBody.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.classList.contains("price-input")) {
    event.target.blur(); // Triggers the "change" event immediately
  }
});

// Pagination: previous - next  ---   buttons

// Previous Button
prevPageBtn.addEventListener("click", () => {
    if(currentPage > 1){
        currentPage-- ;
        renderCurrentPage();
    }
});

// Next Button
nextPageBtn.addEventListener("click", () => {
    currentPage++ ;
    renderCurrentPage();
});

// Update bulk-preview when department, % or rounding changes
bulkDepartment.addEventListener("change", updateBulkPreview);
bulkPercentage.addEventListener("input", updateBulkPreview);
bulkRound.addEventListener("change", updateBulkPreview);

// Apply bulk department change -- Add to unsaved changes
applyDeptBtn.addEventListener("click", () => {

    const deptId = bulkDepartment.value;
    const percentage = parseFloat(bulkPercentage.value) || 0;
    const roundOption = bulkRound.value;

    allProducts.forEach((product) => {
        if(product.categoryId === deptId){
            product.currentPrice = calculateNewPrice(
                product.oldPrice, 
                percentage, 
                roundOption
            );
        }
    });

    applyAllTogether();
    updateBulkPreview();

});

// Discard all unsaved changes
discardBtn.addEventListener("click", ()=> {

    allProducts.forEach((product) => {
        product.currentPrice = product.oldPrice;
    });

    applyAllTogether();
    updateBulkPreview();

});

// Save changes to the supabase / database
saveBtn.addEventListener("click", async () => {

    const changedProduct = allProducts.filter((p) => isPriceChanged(p));

    if(changedProduct.length === 0) return;

    try{
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        await savePriceChanges(changedProduct, currentUser?.id);

        changedProduct.forEach((product) => {
            product.oldPrice = product.currentPrice;
        });

        applyAllTogether();
        updateBulkPreview();

    }catch(error){
        console.error("Error saving prices: ", error);
    }finally{
        // saveBtn.disabled = false;
        saveBtn.textContent = "Saved";
        refreshCounts();
    }

});

// Toggle Dark / White Theme
themeToggleBtn.addEventListener("click",() => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    html.setAttribute("data-theme", currentTheme === "light" ? "dark" : "light");
});

// Sign out
logOutBtn.addEventListener("click", () => {
   signOut();
});

// Warn before leaving pages with unsaved changes
window.addEventListener("beforeunload", (event) => {
  const hasUnsaved = allProducts.some((p) => isPriceChanged(p));
  if (hasUnsaved) {
    event.preventDefault();
    event.returnValue = "Save your changes before leaving.";
  }
});

// Initialize Dashboard
InitializePriceDashboard();