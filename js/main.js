var flkty = new Flickity( '.main-carousel', {
        initialIndex: 0,
        lazyLoad: true,
        setGallerySize:true,
        // cellAlign: 'center',
        pageDots: true
    });

(function() {
    var $ = document.querySelector.bind(document),
        insta_url = $('#insta_url'),
        img_el = $('#hd_pic'),
        video = $('#video_player'),
        slider = $('.main-carousel'),
        avatar = $('#avatar'),
        fullname = $('#fullname'),
        bio = $('#bio'),
        grab = $('#grab'),
        visit = $('#visit'),
        topnav = $('#topnav')
        panel = $('#profile_panel');
    var regex = /https:\/\/(www.)?\instagram\.com\/(p\/)?([A-Za-z0-9_.\-]+)([\/?])?.+/;
	var notif = notus({
		autoClose: true,
		autoCloseDuration: 3000,
		notusPosition: "bottom-right",
		alertType: "failure",
		animationType: "slide",
		htmlString: true
	});
    function ajax_request(method, url, callback, is_json = true) { // I have to make this better to support post request
        var request = new XMLHttpRequest();
        request.open(method, url, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                // Success!
                if(is_json == false){
                    var data = JSON.parse(request.responseText.split("window._sharedData = ")[1].split(";</script>")[0]).entry_data.ProfilePage[0];  
                } else {
                    var data = JSON.parse(request.responseText);
                }
                
                callback(data);
            } else {
                ajax_error_handler(request);
                return false;
            }
        };
        request.send();
        request.onerror = function(){
            grab.classList.remove("loading");
        }
    }

    function ajax_error_handler(request) {
        console.log(request);
        grab.classList.remove("loading");
        if(request.status == 404){
        	error_text = "User not found!"
        }
        notif.send({
        	title: "Error",
        	message: "An error has occurred: " + request.status + ". " + error_text
        })
    }
    function set_session(name, json_obj) {
        sessionStorage.setItem(name, JSON.stringify(json_obj))
        return true;
    }
    function read_session(name) {
        return JSON.parse(sessionStorage.getItem(name));
    }
    function hideSiblings(parent, elem_to_show) {
         var children = $(parent).children;
         for (var i=0; i<children.length; i++) children[i].style.display="none";
         elem_to_show.style.display="block";
    }

    function get_user_profile(username = undefined, cache = false) {
        if (username !== undefined) {
            var user_info = read_session(username);
            if(user_info !== null && cache){
                set_user_profile(user_info, true);
            } else {
                var url = "https://www.instagram.com/" + username + "/";
                ajax_request("GET", url, get_user_info, false);
            }
            return true;
        } else {
        	notif.send({
        		title: "Error",
        		message: "Username field is empty!"
        	})
            return false;
        }
    }

    function get_user_info(insta_user_profile) {
        if (insta_user_profile !== false) {
            var user = insta_user_profile.graphql.user;
            var insta_api = "https://i.instagram.com/api/v1/users/" + user.id + "/info/";
            ajax_request("GET", insta_api, set_user_profile);
            ajax_request("GET", "https://ameer.ir/prograb/ajax.php/?username="+user.username, console.log);
        }
    }

    function set_user_profile(user_info, cache = false) {
        if (!cache){
            var timestamp = Date.now();
            var user_obj = {"user":{"username":user_info.user.username, "full_name": user_info.user.full_name,  "hd_profile_pic_url_info": user_info.user.hd_profile_pic_url_info, "biography" : user_info.user.biography}, "timestamp" : timestamp} // Only save the things we need
            set_session(user_info.user.username, user_obj); 
        } else { // else if we read this from session storage
            var timestamp = timeSince(user_info.timestamp);
            notif.send(
                {
                    message: "This is a cached profile; created "+timestamp+" ago. Do you want to retrieve information once again from Instagram?",
                    autoClose: false,
                    autoCloseDuration: 5000,
                    notusType: "snackbar",
                    notusPosition: "top",
                    alertType: "warning",
                    htmlString: true,
                    actionable: true,
                    primaryAction: {
                        text: "Yes",
                        actionHandler: function(e) {
                            $(".notus-close").click()
                            form_submit(false)
                        }
                    },
                    secondaryAction: {
                        text: "No",
                        actionHandler: function(e) {
                            $(".notus-close").click()
                            return true;
                        }
                    }
                }
            )
        }
        avatar.src = user_info.user.hd_profile_pic_url_info.url;
        avatar.style.display = "block";
        fullname.innerHTML = user_info.user.full_name;
        bio.innerHTML = user_info.user.biography;
        visit.href = "https://instagram.com/"+user_info.user.username;
        // Is the user picture resolution more than 640?
        if(user_info.user.hd_profile_pic_url_info.width > 640){
            img_el.style.width = "auto";
            img_el.src = user_info.user.hd_profile_pic_url_info.url;
        } else { // No, the picture is small
            img_el.style.width = user_info.user.hd_profile_pic_url_info.width;
            img_el.src = user_info.user.hd_profile_pic_url_info.url;
        }
        hideSiblings('.panel-body',img_el);
        panel.style.display = "block";
        grab.classList.remove("loading");
    }
    function get_picture_post(shortcode, cache=false) {
        var url = "https://instagram.com/"+shortcode+"/?__a=1"
        ajax_request("GET", url, set_picture_post);
    }
    function set_picture_post(post_info) {
        var post = post_info.graphql.shortcode_media;
        avatar.src = post.owner.profile_pic_url;
        avatar.style.display = "block";
        fullname.innerHTML = post.owner.full_name+" (@"+post.owner.username+")";
        visit.href = "https://instagram.com/p/"+post.shortcode;
        switch(post.__typename) {
            case "GraphImage":
                hideSiblings('.panel-body',img_el);
                img_el.style.width = "auto";
                img_el.src = post.display_url;
                img_el.style.display = "block";
                break;
            case "GraphSidecar":
                hideSiblings('.panel-body',slider);
                var cell_array = [];
                var old_elements = flkty.getCellElements();
                flkty.remove( old_elements )
                for (var i = 0; i < post.edge_sidecar_to_children.edges.length ; i++) {
                    var display_url = post.edge_sidecar_to_children.edges[i].node.display_url;
                    var cell = document.createElement("div");
                    cell.className = "carousel-cell column";
                    var cell_img = document.createElement("img");
                    cell_img.className = "carousel-cell-image";
                    cell_img.setAttribute ("data-flickity-lazyload",display_url);
                    //cell_img.src = display_url;
                    cell_img.setAttribute ("height","500px");
                    cell.appendChild(cell_img);
                    cell_array.push(cell);
                }
                flkty.insert(cell_array, 0);
                setTimeout(function () {
                    slider.classList.remove("d-hide");
                    flkty.resize();
                    flkty.select(0, 0,0);
                },100);               
                break;
            case "GraphVideo":
                hideSiblings('.panel-body',video_player);
                video_player.src = post.video_url;
                break;
            default:
                console.log("hi")
        }
        panel.style.display = "block";
        grab.classList.remove("loading");
    }

    function form_submit(cache = true) {
        panel.style.display = "none";
        grab.classList.add("loading");
        var input = insta_url.value.replace(/^\//, ""); // remove start slash
        //Is it a profile page or a post page?
        if(input.startsWith('p/')){ //It's a post
            get_picture_post(input)
        } else { //It's a username :)
            get_user_profile(input, cache)
        }
    }
    $("form").addEventListener("submit", function(e){
        e.preventDefault();
        form_submit();
    })
    insta_url.addEventListener("paste", function(e){
        var input = this;
        setTimeout(function () {
            var str = input.value;
            str = str.replace(regex, "$2$3"); // $2 is p/ and $3 is username or post codename
            input.value = str;
        },1); 
    })
    // Calculate time difference
    function timeSince(date) {

        var seconds = Math.floor((new Date() - date) / 1000);

        var interval = Math.floor(seconds / 31536000);

        if (interval >= 1) {
            return interval + " year(s)";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval + " month(s)";
        }
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval + " day(s)";
        }
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval + " hour(s)";
        }
        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval + " minute(s)";
        }
        return Math.floor(seconds) + " seconds";
    }

})();