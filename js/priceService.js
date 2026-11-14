//import client from supabase
import { supabase } from "./supabaseClient";

//get all categories (department) from categories table
export async function getCategories() {
  const { error, data } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch categories.", error);
    throw error;
  }

  return data;
}

//get all products from products table
export async function getAllProducts() {
  const products = [];
  const limit = 1000;
  let start = 0;
  let keepFetching = true;

  while (keepFetching) {
    const end = start + limit - 1;
    const { error, data } = await supabase
      .from("products")
      .select(
        "id, categories_id, legacy_code, title, product_card, cover_family, base_price, price, photo_path",
      )
      .order("id", { ascending: true })
      .range(start, end);

    if (error) {
      console.error("Failed to retrieve products.", error);
      throw error;
    }

    products.push(...data);

    //stop loop if we get less than 1000
    if(data.length < limit){
        keepFetching = false;
    }else{
        start += limit;
    }
  }
  return products;
}

// convert database product into an object with department name and fast search text
export function normalizeProduct(row, categories){
    //find matching categories name
    const category = categories.find(
        (item) => item.id === row.categories_id
    )
    const departmentName = category ? category.name : row.category_id ;
    const startPrice = Number(row.price || 0);

    return{
        id: row.id,
        category_id: row.category_id,
        department: departmentName,
        code: row.legacy_code || "",
        title: row.title || "",
        type: row.product_type || "",
        coverFamily: row.cover_family || "book",
        oldPrice: startPrice,
        currentPrice: startPrice,
        hasPhoto: Boolean(row.photo_path),

        //presave lowercase text so search is instant - faster
        searchText: `&{row.title || ""} &{row.legacy_code || ""} &{departmentName} &{row.product_type || ""}`.toLowerCase()
    };
}

// check if a product's price is changed.
export function isPriceChanged(product){
    return Number(product.currentPrice.toFixed(2)) !== Number(product.oldPrice.toFixed(2));
}

// round price based on selected dropdown option
export function roundPrice(rawPrice, roundOption){
    if(rawPrice <= 0) return 0;

    const exactPrice = Number(rawPrice.toFixed(2));
    const wholeDollars = Math.floor(exactPrice);

    if(roundOption === "$x.95"){
        return Number((wholeDollars + 0.95).toFixed(2));
    }

    if(roundOption === "$x.99"){
        return Number((wholeDollars + 0.99).toFixed(2))
    }

    if(roundOption === "Nearest 10c"){
        return Number((Math.round(exactPrice * 10) / 10).toFixed(10));
    }

    return exactPrice;
}

//Calculate new price using percentage and round option
export function calculateNewPrice(currentPrice, percentage, roundOption){
    const increasedPrice = currentPrice * (1 + percentage / 100);
    return roundOption(increasedPrice, roundOption);
}

//save updated price to supabase
export async function savePriceChanges(updatedPrice, userId) {
    const now = new Date().toISOString();

    for(const product of updatedPrice){
        
    }
}