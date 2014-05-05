/****
This is a test script created to test hashes between two databases
Photos are downloaded from one database and then hashed
These hashes are then compared to the list of hashes in another database

Certain variables have been removed to protect the innocent
****/

var http = require('http'),
dbURL = '',
cradle = require('cradle'),   
connection = new(cradle.Connection)(),
startDate = '',
endDate = '',
userList = [],
crypto = require('crypto'),
fs = require('fs'),
async = require('async'), 
saveDir = '';

//get the list of all dbs 
http.get(dbURL, function(res) {
	
	//parse the list of users from the db
	res.on('data', function(list) {
		userList = JSON.parse(list);
	});

	//once we have all the data
	res.on('end',function(photoViews) {	
		
		for(var i=0; i<userList.length; i++) {
			(function(i) { 
				//ensure that we're only checking user entries
				var id = userList[i].substring(0,2);
				if(id == "id") {
					createFolder(saveDir+userList[i]);
					
					//run printed photos view to download the photos
					photoProcess(userList[i], function(urlList) {

						//hash each photo file
						var files = fs.readdirSync(saveDir+userList[i]);
						var userHashList = [];

						for(var j=0; j<files.length; j++) {
							(function(j) {
								getHash(saveDir+userList[i]+"/"+files[j], function(hash) {
									//save the photo number at the same time as the hash
									var hashEntry = {};
									hashEntry.picture = files[j];
									hashEntry.md5 = hash;
									userHashList.push(hashEntry);
								});
							})(j);
						}

						//get the md5s from orders
						ordersHash(userList[i], function(orderHashList) {
							//attempt to match with those from the userDB
							compareHashes(orderHashList,userHashList,urlList);
						});

				});

				}
			})(i);
		}
	});

});

//create a folder to store the photos for the user in tmp directory
function createFolder(directory) {
	fs.exists(directory, function(exists) {
		if(!exists) {
			fs.mkdir(directory, 0777, function(e) {
				if(e) { 
					console.log(e);
				}
			});
		}
	});
}


//run printedPhotos view for each 
function photoProcess(user, callback) {

	var db = connection.database(user)
		, spec_loc_view = ''
		, opts = { startkey: startDate, endkey: endDate }
		, i = 0;

	db.view(spec_loc_view, opts, function(err, res2) {
		var urls = [];
		async.forEach(res2, function(row, callback) {

			i++;
			//download the files
			var file = fs.createWriteStream(saveDir+user+"/"+"photo"+i+".jpg");

			var photoInfo = {};
			photoInfo.url = row;
			photoInfo.picture = "photo"+i+".jpg";
			urls.push(photoInfo);
			
			http.get(row, function(response) {
				response.pipe(file);
			}).on('error', function(e) {
				console.log("error:" + e.message);
			});
			
			callback();

		}, function(finished) {
			callback(urls);
		});
	});
}			

//get the hash of the file
function getHash(file, callback) {

	var md5 = crypto.createHash('md5');
	var s = fs.readFileSync(file);
	var hash = md5.update(s).digest('hex');
	callback(hash);
}


//get the md5s from orders
function ordersHash(user, callback) {

	var db = connection.database("orders");
	var opts = {key: user};

	db.view('orders/monthly_hashes/', opts, function(err, res) {	
		res.forEach(function (infoArray) {
			callback(infoArray);
		});
	});
}

//compare the hashes to those in users			
function compareHashes(orderHash, userHash, urlList) {

	//for each entry in orders attempt to find the md5 in users
	orderHash.forEach(function(order) {
		userHash.forEach(function(user) {
			//try to find a match
			if(user.md5 == order.ImageHash)
				console.log("match");
		});
	});
}			


