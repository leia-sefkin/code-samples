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
		var user = 0;
		var userList_length = userList.length;
		while(user < userList_length) {
			//ensure that we're only checking user entries
			var id = userList[user].substring(0,2);
			if(id == "id") {
				createFolder(saveDir+userList[user]);
					
				//run printed photos view to download the photos
				photoProcess(userList[user], function(urlList) {

					//hash each photo file
					var files = fs.readdirSync(saveDir+userList[user]);
					var userHashList = [];
					var files_length = files.length;
					var file = 0;

					while(file < files_length) {
						//get hash and photo
						getHash(saveDir+userList[user]+"/"+files[file], function(hash) {
							//save the photo number at the same time as the hash
							var hashEntry = {};
							hashEntry.picture = files[file];
							hashEntry.md5 = hash;
							userHashList.push(hashEntry);
						});

						file++;
					}

					//get the md5s from orders
					ordersHash(userList[user], function(orderHashList) {
						//attempt to match with those from the userDB
						compareHashes(orderHashList,userHashList,urlList);
					});

				});//end printed photos view

			}//end ID check if

			user++;
		}//end userList while
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


