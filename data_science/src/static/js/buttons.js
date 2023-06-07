$(document).ready(function() {
    $("#loginButton").click(function() {
        var username = $("#username").val();
        var password = $("#password").val();
    
        $.ajax({
            url: '/login',
            method: 'POST',
            data: {
                username: username,
                password: password
            },
            success: function(data, status) {
                if (status === 'success') {
                    console.log(data);
                    localStorage.setItem('token', data.access_token);
                    $("#response").html("Status: Logged in");
                } else {
                    $("#response").html("Status: Failed to login");
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                $("#response").html("Status: Failed to login");
            }
        });
    });
    
    $("#logoutButton").click(function() {
        // On logout, simply remove the token from local storage
        localStorage.removeItem('token');
        $("#response").html("Status: Logged out");
    });
    
    $("#startButton").click(function() {
        $.ajax({
            url: '/dev/start_datagen',
            type: 'post',
            headers: {
                "Authorization": 'Bearer ' + localStorage.getItem('token')
            },
            success: function(data, status) {
                console.log(data);
                $("#response").html("Status: " + data.status);
                $("#dataGenStatus").text("true");
                startTicker(); // Start the ticker when data generation starts
            },
            error: function() {
                $("#response").html("Failed to start data generation");
            }
        });
    });
    $("#stopButton").click(function() {
        $.ajax({
            url: '/dev/stop_datagen',
            type: 'post',
            headers: {
                "Authorization": 'Bearer ' + localStorage.getItem('token')
            },
            success: function(data, status) {
                $("#response").html("Status: " + data.status);
                $("#dataGenStatus").text("false");
                stopTicker(); // Stop the ticker when data generation stops
            },
            error: function() {
                $("#response").html("Failed to start data generation");
            }
        });
    });

    $("#clearButton").click(function() {
        $.ajax({
            url: '/dev/clear_datagen_db',
            type: 'post',
            headers: {
                "Authorization": 'Bearer ' + localStorage.getItem('token')
            },
            success: function(data, status) {
                $("#response").html("Status: " + data.status);
                $("#dataGenStatus").text("false");
                stopTicker(); // Stop the ticker when database is cleared
            },
            error: function() {
                $("#response").html("Failed to start clear");
            }
        });
    });
    // Fetch user IDs and populate the form
    $.ajax({
        url: '/fetch_recipients_ids',
        type: 'get',
        headers: {
        "Authorization": 'Bearer ' + localStorage.getItem('token')
        },
        success: function(data, status) {
        $("#response").html("Status: " + status);
        
        // Populate user IDs in the select dropdown
        var select = $("#user_id");
        select.empty(); // Remove old options
        
        // Check if user_ids property exists and is an array
        if (Array.isArray(data.user_ids)) {
            data.user_ids.forEach(function(obj) {
            var userId = obj.id;
            var option = $("<option></option>").attr("value", userId).text(userId);
            select.append(option);
            });
        } else {
            $("#response").html("Invalid server response");
        }
        },
        error: function() {
        $("#response").html("Failed to fetch user IDs");
        }
    });

    $("#userForm").submit(function(e) {
        e.preventDefault();
        var userId = $("#user_id").val();
        $.ajax({
            url:'/compute_similarities/' + userId,
            type: 'get',
            headers: {
                "Authorization": 'Bearer ' + localStorage.getItem('token')
            },
            success: function(data, Status) {
                $("#response").html("Status: " + data.status);
                var ul = $("#matchedGoalsList");
                ul.empty();  // Remove old matched goals
                data.matched_goals.forEach(function(goal) {
                    var li = "<li>Goal1 ID: " + goal.goal1_id + ", Goal1: " + goal.goal1 +"<br> Goal2 ID: " + goal.goal2_id + ", Goal2: " + goal.goal2 + "</li>";
                    ul.append(li);
                });
                console.log("Data object: ", data);  // Add this line
                console.log("Matched Goals Count: ", data.matched_goals.length);  // And this line
                // Display the count    
                $("#goalCount").text("Matched Goals Count: " + data.matched_goals.length);
            },
            
            error: function() {
                $("#response").html("Status: " + data.status);            
            }
        });
    }); 
});