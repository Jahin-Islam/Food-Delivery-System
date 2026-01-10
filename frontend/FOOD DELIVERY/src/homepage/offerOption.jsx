export default function OfferOption(){
    return (
       <div className="filter-section">
              <p className="filter-label">Offers</p>
              <label className="filter-option">
                <input type="checkbox" name="offers" />
                <span>Free delivery</span>
              </label>
               <label className="filter-option">
                <input type="checkbox" name="offers" />
                <span>Accepts vouchers</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" name="offers" />
                <span>Deals</span>
              </label>
            </div>
    )
}