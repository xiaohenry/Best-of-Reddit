/* TODO
* - Fancybox captions and overlay info displayed. Upvotes + Subreddit + Author + Hyperlink to reddit post
* - Suggestions: other subreddits to pull from? grid layout vs individual photo layout? Additional features?
* - Hide all photos without the selected subreddit class
* - about/contact page -->
* - figure out what to do with mobile. fancybox
*/
Parse.initialize("X2LAw7lIniuSLwzVLsQRQSRqCXwtwBHEg09Okase", "5m9oPZAoy6Nk8mMIKGLO4ASS7FAhNj9aCJkRQud7");

var curDisplayed = 0;
var batchSize = 9;
var isMobile = false;

if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    isMobile = true;
    batchSize = 6;
}

$(document).on('ready', function() {

    $('a.grouped').fancybox({
        'padding': 3,
        'closeSpeed' : 100,
        'nextEffect' : 'fade',
        'closeEffect' : 'fade',
        'nextSpeed' : 200
    });

    bindEventListeners();
    fetchPhotos();

}); //end document.ready

/**
 * @function bindEventListeners
 * @description binds DOM event listeners
 */
function bindEventListeners() {
    $('input, textarea').on('focus', function() {
        $(this).addClass('used');
    }).on('blur', function() {
        if (!$(this).val()) {
            $(this).removeClass('used');
        }
    });

    $('.logo').on('click', function() {
        $('.about-container').hide();
        $('.contact-container').hide();
        $('footer').hide();
        $('.more-container').show();
        $('.nav-links').show();
        $('.photo-container').show();
        $('.contact-link').removeClass('selected');
        $('.about-link').removeClass('selected');
    });

    $('.contact-link').on('click', function() {
        $('.nav-links').hide();
        $('.photo-container').hide();
        $('.about-container').hide();
        $('.more-container').hide();
        $('footer').show();
        $('.contact-container').show();
        $('.about-link').removeClass('selected');
        $(this).addClass('selected');
    });

    $('.about-link').on('click', function() {
        $('.nav-links').hide();
        $('.photo-container').hide();
        $('.contact-container').hide();
        $('.more-container').hide();
        $('footer').show();
        $('.about-container').show();
        $('.contact-link').removeClass('selected');
        $(this).addClass('selected');
    });

    $('.subreddit-filter').on('click', function() {
        var subreddit = $(this).data('subreddit');
        $('.selected').removeClass('selected');
        $(this).addClass('selected');

        $('.photo').each(function(){
            $(this).removeClass('hidden');
        });
        if (subreddit !== 'all') {
            $('.photo').each(function() {
                if (!$(this).hasClass(subreddit)) {
                    $(this).addClass('hidden');
                }
            });
        }
    });

    $('.more-button').on('click', function() {
        fetchPhotos();
    });
}


/**
 * @function fetchPhotos
 * @description Fetch photos from Parse DB and append to DOM
 */
function fetchPhotos() {
    $('.more-container').hide();
    $('.loader-container').show();

    var Photo = Parse.Object.extend('Photo');
    var query = new Parse.Query(Photo);
    query.limit(batchSize);
    query.skip(curDisplayed);
    query.descending('created');
    query.find().then(
        function(photos) {
            curDisplayed += batchSize;
            var photoContainer = $('.photo-container');
            photos.forEach(function(photo) {

                var subreddit = photo.get('subreddit').toLowerCase(),
                    score = photo.get('score'),
                    src = photo.get('src'),
                    date = photo.get('created'),
                    author = photo.get('author'),
                    permalink = photo.get('permalink');

                // TODO: for some reason, every photo fails this check --> b/c 1st photo was failing and it cached?
                // if (!Utils.testImage(src)) {
                    // console.error('Image failed to load');
                // }

                photoContainer.append(
                    '<div class="hidden photo ' + subreddit + '">' +
                    '<a class="grouped" rel="bestof" href="' + src + '">' +
                    '<img class="photo-img" data-lightbox="bestof" src="' + src + '">' +
                    '</a>' +
                    '<div class="overlay">' +
                    '<div class="photo-info"><i class="fa fa-arrow-up fa-1x"></i> ' + score + '</div>' +
                    '<div class="photo-info"><a target="_blank" href="https://reddit.com/r/' + subreddit + '"><i class="fa fa-reddit fa-1x"></i> r/' + subreddit + '</a></div>' +
                    '<div class="photo-info"><a target="_blank" href="https://reddit.com/user/' + author + '"><i class="fa fa-pencil fa-1x"></i> ' + author + '</a></div>' +
                    '<div class="photo-info"><a target="_blank" href="https://reddit.com' + permalink + '"><i class="fa fa-link fa-1x"></i> link</a></div>' +
                    '</div>' +
                    '</div>'
                );
            });

            $('.hidden.photo').each(function() {
                var filter = $('.selected.subreddit-filter').data('subreddit');
                if (filter === 'all' || $(this).hasClass(filter)) {
                    $(this).removeClass('hidden');
                }
                if (isMobile) {
                    $(this).children('.overlay').css('opacity', 1);
                }
            });

            $('.loader-container').hide();
            $('.more-container').show();

        },
        function(error) {
            console.log('Failed to load photos');
        }
    );
}

var Utils = {
    testImage: function(url) {
        var img = new Image();
        img.onload = function() {
            return true;
        };
        img.onerror = function() {
            return false;
        };
        img.src = url;
    }
};
