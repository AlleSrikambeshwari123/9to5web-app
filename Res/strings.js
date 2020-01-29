// Keys
exports.user_auth_key = "9-5 Import";

// Roles
exports.role_admin = "Admin";
exports.role_warehouse_fl = "Warehouse Fl";
exports.role_warehouse_nas = "Warehouse NAS";
exports.role_warehouse_bahamas = "Warehouse BAHAMAS";
exports.role_location_manager = "Location Manager";
exports.role_customer_agent = "Custom Agent";
exports.role_cashier = "Cashier";
exports.role_store = "Stores";

// Redis Keys
exports.redis_prefix_user = "user:";
exports.redis_id_user = "id:user";

exports.redis_prefix_customer = "customer:";
exports.redis_id_customer = "id:customer";

exports.redis_prefix_location = "location:";
exports.redis_id_location = "id:location";

exports.redis_prefix_vehicle = "vehicle:";
exports.redis_id_vehicle = "id:vehicle";

exports.redis_prefix_driver = "driver:";
exports.redis_id_driver = "id:driver";

exports.redis_prefix_pilot = "pilot:";
exports.redis_id_pilot = "id:pilot";
exports.redis_prefix_pilot_list = "list:pilot:";

exports.redis_prefix_shipper = "shipper:";
exports.redis_id_shipper = "id:shipper";

exports.redis_prefix_hazmat = "hazmat:";
exports.redis_id_hazmat = "id:hazmat";

exports.redis_id_awb_init = 100000;
exports.redis_prefix_awb = "awb:";
exports.redis_id_awb = "id:awb";
exports.redis_prefix_no_docs_list = "list:awb:no";

exports.redis_id_manifest_init = 10000;
exports.redis_prefix_manifest = "manifest:";
exports.redis_id_manifest = "id:manifest";
exports.redis_prefix_manifest_open_list = "list:manifest:open";

// Const strings
exports.string_response_error = "Internal Server Error !";
exports.string_response_updated = "Successfully Updated !";
exports.string_response_created = "Successfully Created !";
exports.string_response_removed = "Successfully Removed !";
exports.string_response_added = "Successfully Added !";
exports.string_not_found_user = "Sorry, we can't find this user.";
exports.string_not_found_customer = "Sorry, we can't this customer.";
exports.string_not_found_vehicle = "Sorry, we can't find this vehicle.";
exports.string_not_found_driver = "Sorry, we can't find this driver.";
exports.string_user_exist = "Sorry, same username already exist.";
exports.string_password_incorrect = "Incorrect Password.";