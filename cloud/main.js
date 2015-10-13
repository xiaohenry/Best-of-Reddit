/**
 * @author Henry Xiao
 * @description Cloud code for bestof-reddit webapp, which fetches photo from subreddits and displays them.
 */
/*TODO

- Color scheme,

*/

/**
 * @constructor Photo
 * @type {Parse Object}
 *
 */
var Photo = Parse.Object.extend('Photo', {}, {
    create: function(config) {
        var photo = new Photo();
        for (var key in config) {
            photo.set(key, config[key]);
        }
        return photo;
    }
});

var Count = Parse.Object.extend('Count');

/**
 * @function beforeSave Photo
 * @type Cloud beforeSave
 * @description DB validation on Photo objects before saving
 *
 */
 // Parse.Cloud.beforeSave('Photo', function(request, response) {
 //    var query = new Parse.Query(Photo);
 //    query.equalTo('photoId', request.object.get('photoId'));
 //    query.first().then(
 //        function(photo) {
 //            if (photo) {
 //                response.error('ERROR: Photo Object already exists');
 //            } else {
 //                response.success();
 //            }
 //        },
 //        function(error) {
 //            response.error('Could not validate uniqueness');
 //        }
 //    );
 // });

/**
 * @function publishAndUpdatePhoto
 * @type Cloud Job
 * @description updates all Photos and publishes new ones.
 *
 */
Parse.Cloud.job('publishAndUpdatePhoto', function(request, response) {

    // allow access to write data
    Parse.Cloud.useMasterKey();

    // array containing subreddit urls
    var urls = [
            'https://www.reddit.com/r/lowpoly.json',
            'https://www.reddit.com/r/wallpapers.json',
            'https://www.reddit.com/r/earthporn.json'
        ],
        photosAdded = 0,
        batchSize = 333;

    /**
     * @function initialize
     * @description Self-invoking initialize function
     */
    (function initialize() {
        updatePhotos();
        getPhotos(urls);
    })();

    /**
     * @function updatePhotos
     * @description update Photos in the DB
     */
     function updatePhotos() {
         var query = new Parse.Query(Photo);
         //TODO: skip the updated count, limit to batchSize (333)
         query.limit(1000);
         query.find().then(
             function(photos) {
                 photos.forEach(function(photo){
                    Parse.Cloud.httpRequest({
                        url: 'https://www.reddit.com' + photo.get('permalink') + '.json',
                        method: 'GET'
                    }).then(
                        function(response) {
                            var data, score, photoId;
                            console.log('UPDATING PHOTO OBJECT');

                            data = response.data[0].data.children[0].data;
                            score = data.score;
                            photoId = data.id;

                            var query_2 = new Parse.Query(Photo);
                            query_2.equalTo('photoId', photoId);
                            query_2.first().then(
                                function(Photo) {
                                    Photo.save(null).then(
                                        function(photo) {
                                            photo.set('score', score);
                                            photo.save();
                                            console.log('SUCCESS: UPDATED & SAVED');
                                        },
                                        function(error) {
                                            console.log('ERROR: FAILED TO UPDATE & SAVE' + error.message);
                                        }
                                    );
                                },
                                function(error) {
                                    console.log('Could not find & update photo');
                                }

                            );
                        },
                        function(error) {
                            console.log('ERROR: updating photos');
                        }
                    );
                 });
                 //TODO: update the updated count, if it passes size, reset to 0

                 //curUpdated += batchSize;
                //  curUpdated > photos ? 0 : curUpdated;
             },
             function(error) {
                console.log('ERROR: Updating photos');
             }
         );
     }

    /**
     * @function getPhotos
     * @description Fetch photos from subreddit URLs, call validate, and add to DB
     * @param urls {Array} The subreddit urls to fetch data from
     */
    function getPhotos(urls) {
        urls.forEach(function(url) {
            Parse.Cloud.httpRequest({
                url: url,
                method: 'GET'
            }).then(
                function(response) {
                    var data = response.data;
                    // Grab top (3) posts from today
                    data = data.data.children.slice(0, 3);
                    data.forEach(function(post) {
                        var src = '';
                        if (post.data.preview) {
                            src = post.data.preview.images[0].source.url;
                        }
                        var config = {
                            photoId: post.data.id,
                            src: src,
                            created: post.data.created,
                            author: post.data.author,
                            subreddit: post.data.subreddit,
                            domain: post.data.domain,
                            score: post.data.score,
                            permalink: post.data.permalink
                        };
                        console.log('****CREATING NEW PHOTO OBJ FROM ' + config.subreddit + ' WITH AUTHOR ' + config.author + '****');
                        validate(config);
                    });

                    var query = new Parse.Query(Count);
                    query.equalTo('name', 'Photo');
                    query.first().then(
                        function(Count) {
                            Count.save(null).then(
                                function(count) {
                                    count.set('count', count.get('count') + photosAdded);
                                    count.save();
                                    console.log('UPDATED COUNT');
                                },
                                function(error) {
                                    console.log('FAILED TO UPDATE COUNT');
                                }
                            );
                        },
                        function(error) {
                            console.log('FAILED TO UPDATE COUNT');
                        }
                    );
                },
                function(response) {
                    console.log('Error');
                });
        });
    }

    /**
     * @function validate
     * @description Validate the photo object before adding to DB
     * @param config {Object} Validate this object
     */
    function validate(config) {

        // currently accepted: imgur | tumblr
        if (config.domain.indexOf('imgur.com') === -1 && config.domain.indexOf('tumblr.com') === -1) {
            console.log('ERROR: BAD DOMAIN: ' + config.domain + ' FROM ' + config.subreddit);
            return;
        }
        if (config.src === '' || config.src === null) {
            console.log('ERROR: NONE/BAD SRC FROM ' + config.subreddit);
            return;
        }

        var query = new Parse.Query(Photo);
        query.equalTo('photoId', config.photoId);
        query.first().then(
            function(photo) {
                if (!photo) {
                    console.log("SUCCESS: Photo doesn't exist in DB yet");
                    addPhoto(config);
                } else if (photo) {
                    console.log('ERROR: Photo already exists in DB');
                }
            },
            function(error) {
                console.log("ERROR: Failed to validate");
            }
        );
    }


    /**
     * @function appendPhoto
     * @description create Photo model
     * @param config {Object} config object containing photo fields
     */
    function addPhoto(config) {
        var photo = Photo.create(config);
        console.log('****ADDING PHOTO TO DB****');
        photo.save(null).then(
            function(object) {
                console.log('SUCCESS: SUCCESSFULLY SAVED');
                photosAdded++;
            },
            function(error) {
                console.log('ERROR: FAILED TO SAVE');
            });
    }

});
