/****
This is a test script created to compare the list of ordered photos 
to those selected by the user to print and vice versa

The results are output to a file for each comparison set

Certain variables have been removed to protect the innocent
****/

var http = require('http'),
dbURL = '',
cradle = require('cradle'),   
connection = new(cradle.Connection)(),
startDate = '', 
endDate = '', 
userList = [],
fs = require('fs'),
async = require('async'), 
orderResultsFile = '',
userResultsFile = '';

//get the list of all dbs from couchdb
http.get(dbURL, function(res) {

	//remove the results files if they already exist
	fs.exists(orderResultsFile, function(exists) {
		if(exists) {
			fs.unlink(orderResultsFile, function(err) {
				if(err) throw err;
			});
		}
	});

	fs.exists(userResultsFile, function(exists) {
		if(exists) {
			fs.unlink(userResultsFile, function(err) {
				if(err) throw err;
			});
		}
	});
	
	//parse the list of users from the db
	res.on('data', function(list) {
		userList = JSON.parse(list);
	});

	//once we have all the data 
	res.on('end',function(photoViews) {	

		var listLength = userList.length;
		var user = 0;

		while(user < listLength) {
			//ensure that we're only checking user entries
			var id = userList[user].substring(0,2);
			
			if(id == "id") {
				
				async.auto({
					//get the md5s from the user db
					get_MD5s:function(callback, results){
						getUserMD5s(userList[user], callback);
					},
					//get the md5s from the order db
					get_order_MD5s: ['get_MD5s', function(callback, results) {
						getOrderMD5s(userList[user], callback);
					}],
					//attempt to match order with users
					compare_order_hashes: ['get_order_MD5s', function(callback, results) {
						compareOrderHashes(userList[user], results.get_MD5s, results.get_order_MD5s, callback);
					}],
					//attempt to match users with orders
					compare_user_hashes: ['compare_order_hashes', function(callback, results) {
						compareUserHashes(userList[user], results.get_MD5s, results.get_order_MD5s, callback);
					}]
				}, function(err, result) {
					if(err) {
						callback("ERROR: ", err);
					} else {
						callback(null, results);
					}
				});
			}

			user++;
		}

	});

});

//get the md5 from the user db
function getUserMD5s(user, callback) {

	var spec_loc_of_view = '',
	, db = connection.database(user)
	, opts = { startkey: startDate, endkey: endDate };

	db.view(spec_loc_of_view, opts, function(err, res) {
		var userMD5s = [];
		if(res) {
			async.forEach(res, function(row, callback) {
				userMD5s.push(row);
				callback();
			}, function(finished) {
				callback(userMD5s);
			});
		}
	});
}

//get the order md5 
function getOrderMD5s(user, callback) {

	var order_db = ''
	, spec_loc_of_view = ''
	, db = connection.database(order_db)
	, opts = { key : user };

	db.view(spec_loc_of_view, opts, function(err, res) {
		res.forEach(function(md5) {
			callback(md5);
		});

	});

}

//compare the order hashes to user hashes			
function compareOrderHashes(userID, userHash, orderHash, callback) {
	
	var match = false,
		, o = 0
		, u = 0;

	fs.appendFileSync(orderResultsFile, "UserID: " + userID + " OrderID: " + orderHash[0] + "\n");

	//for each entry in orders attempt to find the md5 in users
	async.forEach(orderHash, function(order, callbackOrders) {
		if(order.AssetPath) {
			++o;

			async.forEach(userHash, function(user, callbackUsers) {
				if(order.ImageHash == user.md5) {
					match = true;
					++u;
				}
				callbackUsers();

			}, function(users_finished) {
				if(!match) {
					fs.appendFileSync(orderResultsFile, order.AssetPath + "\n \n");
				}
			});
		}

		callbackOrders();

	}, function(orders_finished) {
		if(match) {
			fs.appendFileSync(orderResultsFile, "Good! \n \n");
		}
		callback();
	});	
}			

//compare the user hashes with order hashes
function compareUserHashes(userID, userHash, orderHash) {

	var match = false,
		, o = 0
		, u = 0;
	
	fs.appendFileSync(userResultsFile, "UserID: " + userID + " OrderID: " + orderHash[0] + "\n");

	//for each entry in orders attempt to find the md5 in users
	async.forEach(userHash, function(user, callbackUsers) {
			++o;
		async.forEach(orderHash, function(order, callbackOrders) {
			if(order.AssetPath && order.ImageHash == user.md5) {
					match = true;
					++u;
			}
			callbackOrders();
		}, function(orders_finished) {
			if(!match) {
				fs.appendFileSync(userResultsFile, "Source " + user.Source + "\n Social Source " + user.socialSource + "\n\n");
			}
		
		});

		callbackUsers();

	}, function(users_finished) {
		if(match) 
			fs.appendFileSync(userResultsFile, "Good! \n \n");
	});	
}			


