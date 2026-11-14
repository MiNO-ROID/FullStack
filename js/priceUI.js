//import functions from priceService.js
import { isPriceChanged, calculateNewPrice } from "./priceService";

//populate both department dropdown from categories table
export function displayDepartments(categories) {
  const filterSelect = document.getElementById("filter-department");
  const bulkSelect = document.getElementById("bulk-department");

  //clear existing options
  filterSelect.innerHTML = "";
  bulkSelect.innerHTML = "";

  //Add "All departments" to the filter department
  const allOptions = document.createElement("option");
  allOptions.value = "all";
  allOptions.textContent = "All departments";
  filterSelect.appendChild(allOptions);

  //Add each categories to both dropdown
  categories.forEach((category) => {
    const filterOptions = document.createElement("option");
    filterOptions.value = category.id;
    filterOptions.textContent = category.name;
    filterSelect.appendChild(filterOptions);

    const bulkOptions = document.createElement("option");
    bulkOptions.value = category.id;
    bulkOptions.textContent = category.name;

    if (category.id === "globes") {
      bulkOptions.selected = true;
    }

    bulkSelect.appendChild(bulkOptions);
  });
}

//update header subtitles and discard/save buttons
export function updateHeaderStatus(totalCount, changedCount) {
  const subtitle = document.getElementById("price-status-subtitle");
  const discardBtn = document.getElementById("discard-btn");
  const saveBtn = document.getElementById("save-btn");

  if (changedCount === 0) {
    subtitle.textContent = `0 of ${totalCount.toLocaleString()} prices differ from the old price list. Nothing waiting to save.`;
    discardBtn.disabled = true;
    saveBtn.disabled = true;
  } else {
    subtitle.textContent = `${changedCount.toLocaleString()} of ${totalCount.toLocaleString()} prices differ from the old price list. ${changedCount.toLocaleString()} waiting to save.`;
    discardBtn.disabled = false;
    discardBtn.disabled = false;
  }
}

//Update numbers on all tabs -- all photos, changed, no photos
export function updateTabsCount() {
  document.getElementById("tab-all-count").textContent =
    totalCount.toLocaleString();
  document.getElementById("tab-changed-count").textContent =
    changedCount.toLocaleString();
  document.getElementById("tab-noPhoto-count").textContent =
    noPhotoCount.toLocaleString();
}

//Create a single table row for (<tr>) for each product
function createProductRow() {
  const tr = document.createElement("tr");
  const changed = isPriceChanged(product);

  if (changed) {
    tr.className("row-changed");
  }

  //calculate price difference for change column
  const diff = product.currentPrice - product.oldPrice;
  let changedText = "-";
  let changeClass = "change-cell";

  if (changed) {
    const sign = diff > 0 ? "+" : "-";
    changedText = `${sign}$${Math.abs(diff).toFixed(2)}`;
    changeClass = diff < 0 ? "change-cell negative" : "change-cell changed";
  }

  tr.innerHtml = `    
    <td>
      <div class="book-thumb">
        <span class="spine"></span>
        <span class="cover"></span>
      </div>
    </td>

    <td>
        <div class="product-title">
            ${product.title}
        </div>
        <div class="product-meta">
            ${product.code} · ${product.type}
        </div>
    </td>

    <td class="dept-cell">${product.department}</td>

    <td class="price-cell">
      <div class="price-input-wrapper ${changed ? "is-changed" : ""}">
        <span class="currency-symbol">$</span>
        <input
          type="number"
          step="0.01"
          class="price-input"
          data-id="${product.id}"
          value="${product.currentPrice.toFixed(2)}"
        />
      </div>
    </td>
    
    <td class="${changeClass}">${changeText}</td>
    `;

    return tr;
}

//display current page of products in the table
export function displayProducts(productsOnPage, totalFilteredCount){
    const tbody = document.gegtElementById("products-tbody");
    const filterCount = document.getElementById("filter-count");

    //update products count
    filterCount.textContent = `${totalFilteredCount.toLocaleString()} products`;

    //clear old table rows
    tbody.innerHTML = "";

    if(productsOnPage.length === 0){
        tbody.innerHTML = `        
        <tr> 
            <td colspan="5" class="empty-state"> 
                No products found.
            </td> 
        </tr>
        `;
        return;
    }

    //use of DocumentFragment for fast rendering
    const fragment = document.createDocumentFragment();

    productsOnPage.forEach((product) =>{
        const row = createProductRow(product);
        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);
}

// Update pagination & previous/next buttons
export function updatePagination(currentPage, pagesize, totalFilteredCount){
    const pagInfo = document.getElementById("pagination-info");
    const prevBtn = document.getElementById("prev-page-btn");
    const nextBtn = document.getElementById("next-page-btn");

    const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pagesize));

    if(totalFilteredCount === o){
        pagInfo.textContent = "0 of 0";
    }else{
        const start = (currentPage - 1) * pagesize + 1;
        const end = Math.min(currentPage * pagesize, totalFilteredCount);
        pagInfo.textContent = `${start} - ${end} of ${totalFilteredCount.toLocaleString()}`;
    }

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Update "Change a department" preview box
export function displayDepartmentPreview(departmentProducts, percentage, roundOption){
    const countEl = document.getElementById("preview-count");
    const avgEl = document.getElementById("preview-avg"); 
    const nameEl = document.getElementById("preview-sample-name");
    const priceEl = document.getElementById("preview-sample-price");

    const count = departmentProducts.length;
    countEl.textContent = count;

    if(count === 0){
        avgEl.textContent = "0.00 --> 0.00";
        nameEl.textContent = "None";
        priceEl.textContent = "0.00 --> 0.00";
        return;
    }

    // calculate old and new avg price
    let oldTotal = 0;
    let newTotal = 0;

    departmentProducts.forEach((product) =>{
        oldTotal += product.currentPrice;
        newTotal += calculateNewPrice(product.currentPrice, percentage, roundOption)
    });

    const oldAvg = (oldTotal / count).toFixed(2);
    const newAvg = (newTotal / count).toFixed(2);
    avgEl.textContent = `$${oldAvg} --> $${newAvg}`;

    // Show first product in the department as sample - example
    const firstProduct = departmentProducts.length[0];
    const sampleNewPrice = calculateNewPrice(firstProduct.currentPrice, percentage, roundOption);
    const shortTitle = firstProduct.title.length > 22
      ? firstProduct.title.slice(0, 20) + "..."
      : firstProduct.title;

      nameEl.textContent = shortTitle;
      priceEl.textContent = `$${firstProduct.currentPrice.toFixed(2)} --> $${sampleNewPrice.toFixed(2)}`;
}