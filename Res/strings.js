// Keys
exports.user_auth_key = "9-5 Import";

// Roles
exports.role_admin = "Admin";
exports.role_warehouse_fl = "Warehouse FLL";
exports.role_warehouse_nas = "Warehouse NAS";
exports.role_warehouse_bahamas = "Warehouse BAHAMAS";
exports.role_location_manager = "Location Manager";
exports.role_customer_agent = "Custom Agent";
exports.role_cashier = "Cashier";
exports.role_store = "Stores";

// Companies
exports.company_9to5 = "9to5";
exports.company_PostBoxes = "Post Boxes";

// Redis Keys
exports.redis_prefix_user = "user:";
exports.redis_id_user = "id:user";

exports.redis_prefix_customer = "customer:";
exports.redis_id_customer = "id:customer";

exports.redis_prefix_location = "location:";
exports.redis_id_location = "id:location";

exports.redis_prefix_vehicle = "vehicle:";
exports.redis_id_vehicle = "id:vehicle";
exports.redis_prefid_vehicle_list = "list:vehicle:"; // + location

exports.redis_prefix_driver = "driver:";
exports.redis_id_driver = "id:driver";
exports.redis_prefix_driver_list = "list:driver:"; // + location ( nas / fll )

exports.redis_prefix_pilot = "pilot:";
exports.redis_id_pilot = "id:pilot";
exports.redis_prefix_pilot_list = "list:pilot:";

exports.redis_prefix_planes = "plane:";
exports.redis_prefix_planes_list = "list:plane:";
exports.redis_id_plane = "id:plane";
exports.redis_prefix_plane_compartment = "compartment:"
exports.redis_prefix_plane_compartment_list = "list:compartment:"; // + planeId
exports.redis_id_compartment_plane = "id:compartment";

exports.redis_prefix_shipper = "shipper:";
exports.redis_id_shipper = "id:shipper";

exports.redis_prefix_origin_barcode = "originBarcode:";
exports.redis_id_origin_barcode = "id:originBarcode";

exports.redis_prefix_awbpo = "awbpo:";
exports.redis_id_awbpo = "id:awbpo";
exports.redis_prefix_container = "container:";
exports.redis_id_container = "id:container";

exports.redis_prefix_airport = "airport:";
exports.redis_id_airport = "id:airport";

exports.redis_prefix_paid_type = "paidType:";
exports.redis_id_paid_type = "id:paidType";

exports.redis_prefix_service_type = "serviceType:";
exports.redis_id_service_type = "id:serviceType";

exports.redis_prefix_airline = "airline:";
exports.redis_id_airline = "id:airline";

exports.redis_prefix_carrier = "carrier:";
exports.redis_id_carrier = "id:carrier";

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

exports.redis_prefix_delivery = "delivery:";
exports.redis_id_delivery = "id:delivery";

// Package
exports.redis_prefix_package = "package:";
exports.redis_id_package = "id:package";

exports.redis_prefix_awb_package_list = "list:awb:package";
exports.redis_prefix_manifest_package_list = "list:manifest:package";
exports.redis_prefix_delivery_package_list = "list:delivery:package";
exports.redis_prefix_location_package_list = "list:location:package";

exports.redis_prefix_package_status = "status:package:";
exports.redis_id_package_status = "id:status:package";
exports.redis_prefix_list_package_status = "list:status:package:";

// Const strings
exports.string_response_error = "Internal Server Error !";
exports.string_response_updated = "Successfully Updated !";
exports.string_response_created = "Successfully Created !";
exports.string_response_removed = "Successfully Removed !";
exports.string_response_added = "Successfully Added !";
exports.string_response_shipped = "Successfully Shipped !";
exports.string_response_received = "Successfully Received !";
exports.string_response_loaded = "Successfully Loaded !";
exports.string_response_stored = "Successfully Stored !";
exports.string_response_already_added = "Already Added !";
exports.string_response_print_awb = "AirWay Bill sent to the printer.";

exports.string_not_found_user = "Sorry, we can't find this user.";
exports.string_not_found_location = "Sorry, we can't find this Location.";
exports.string_not_found_customer = "Sorry, we can't find this customer.";
exports.string_not_found_vehicle = "Sorry, we can't find this vehicle.";
exports.string_not_found_driver = "Sorry, we can't find this driver.";
exports.string_not_found_pilot = "Sorry, we can't find this pilot.";
exports.string_not_found_plane = "Sorry, we can't find this plane.";
exports.string_not_found_hazmat = "Sorry, we can't find this HAZMAT Class.";
exports.string_not_found_service_charge = "Sorry, we can't find this service charge.";
exports.string_user_exist = "Sorry, same username already exist.";
exports.string_password_incorrect = "Incorrect Password.";