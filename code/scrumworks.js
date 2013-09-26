$(function () {
    if (localStorage.sendToEmail) {
        $("body *").remove();
        $("body").append("<div>" + localStorage.sendToEmail + "</div>");
        localStorage.sendToEmail = "";
        setTimeout(function() {window.close()}, 5000);
    }

    if (window.webkitNotifications.checkPermission() != 0) { // 0 is PERMISSION_ALLOWED
        $("a").click(function () {
            window.webkitNotifications.requestPermission()
        })
    }

    if ($(".tab-header"))

    $("#displayDailyUpdateButton").remove();
    $("#dailyUpdateResult").remove();
    $(".tab-header").append('<button id="showOrHideAllUserStory">Hide All UserStory</button><button id="displayDailyUpdateButton">Daily Update</button><button id="closeDailyUpdateButton" style="display:none">Close</button>');

    function hideDoneUserStory() {
        $("#showOrHideAllUserStory").text("Show All User Story");
        $(".taskboard-pbi.done").parents("tr").prev().andSelf().css("display", "none")
    }

    function showAllUserStory() {
        $("#showOrHideAllUserStory").text("Hide All User Story");
        $(".taskboard-pbi.done").parents("tr").prev().andSelf().css("display", "table-row")
    }

    $("#showOrHideAllUserStory").toggle(hideDoneUserStory, showAllUserStory);

    setTimeout(function() {
        $("#showOrHideAllUserStory").click();
    }, 2000);

    $("#closeDailyUpdateButton").click(function () {
        $("#dailyUpdateResult").remove();
        $(this).css("display", "none");
    })

    var displayDailyUpdateTable = function () {
        console.log("Generating daily update");

        var todayHour = 20;
        var todoHour = 0;
        var remainingHour = 0;
        var userStoryCount = 0;
        var allTaskIndex = 0;
        var allTeamMembers = new Array();
        var allTaskHours = new Array();
        var teamMemberHours = {
        };

        function getTasks(doc) {
            var tasks = new Array();
            $(doc).find(".taskboard-task-title a").each(function () {
                var taskTitle = $(this).attr("title");
                tasks.push(taskTitle);
            });
            return tasks;
        }

        function getOrginalTaskID(doc) {
            var taskIDs = new Array();
            $(doc).find(".taskboard-task").each(function() {
                taskIDs.push($(this).attr("id"));
            })
            return taskIDs;
        }

        function getUserStoryTaskID(doc) {
            var userStoryIDs = new Array();
            $(doc).parents(".taskboard-pbi-row").each(function() {
                userStoryIDs.push($(this).attr("id"));
            })
            return userStoryIDs;
        }

        function getEsts(doc) {
            var ests = new Array();
            $(doc).find(".taskboard-task-estimate").each(function () {
                var taskEst = $(this).text();
                ests.push(taskEst);
            });
            return ests;
        }

        function updateOwnerName(taskOwner) {
            if (taskOwner == "(unspecified)") {
                taskOwner = "ADD_OWNER";
            } else {
                taskOwner = taskOwner.replace(/.\(.*\)/g, '');
            }
            return taskOwner;
        }

        function printAllTeamMemebers() {
            $(".taskboard-task-point-person").each(function () {
                var taskOwner = $(this).attr("title");
                taskOwner = updateOwnerName(taskOwner);

                for (var member in allTeamMembers) {
                    if (allTeamMembers[member] == taskOwner) {
                        return;
                    }
                }
                if (taskOwner != "ADD_OWNER") {
                    allTeamMembers.push(taskOwner);
                }
            })

            for (var index in  allTeamMembers) {
                var teamMember = allTeamMembers[index];
                var teamMemberHourID = teamMember.replace(" ", "_");
                teamMemberHours[teamMemberHourID] = 0;
                $("#dailyUpdateTeam").append(teamMember + " (<span id='teamMemberHour" + teamMemberHourID + "'></span>) ");
            }
        }

        function getOwner(doc) {
            var owners = new Array();
            $(doc).find(".taskboard-task-point-person").each(function () {
                var taskOwner = $(this).attr("title");
                taskOwner = updateOwnerName(taskOwner);
                owners.push(taskOwner);
            })
            return owners;
        }

        $("#closeDailyUpdateButton").css("display", "inline-block");
        $("#dailyUpdateResult").remove();
        var rank = 1;
        if (!localStorage.todoToday) {
            localStorage.todoToday = 20;
        } else {
            todayHour = localStorage.todoToday;
        }

        $(".tab-header").append('<div id="dailyUpdateResult" style="background-color: white; width: 800px; margin-top: 30px; width: 100%">' +
            '<div id="todoTimeline">' +
            '<input type="text" name="timeLineTask" id="timeLineTask"/>' +
            '<select name="timeLineTaskHour" id="timeLineTaskHour">' +
            '<option value="HOUR1000">10:00</option>' +
            '<option value="HOUR1030">10:30</option>' +
            '<option value="HOUR1100">11:00</option>' +
            '<option value="HOUR1130">11:30</option>' +
            '<option value="HOUR1200">12:00</option>' +
            '<option value="HOUR1230">12:30</option>' +
            '<option value="HOUR1300">13:00</option>' +
            '<option value="HOUR1330">13:30</option>' +
            '<option value="HOUR1400">14:00</option>' +
            '<option value="HOUR1430">14:30</option>' +
            '<option value="HOUR1500">15:00</option>' +
            '<option value="HOUR1530">15:30</option>' +
            '<option value="HOUR1600">16:00</option>' +
            '<option value="HOUR1630">16:30</option>' +
            '<option value="HOUR1700">17:00</option>' +
            '<option value="HOUR1730">17:30</option>' +
            '<option value="HOUR1800">18:00</option>' +
            '<option value="HOUR1830">18:30</option>' +
            '</select>' +
            '<button id="addTimeLineTaskButton">Add TimeLine Task</button><button id="clearAllTimeLineTasksButton">Clear All Tasks</button>' +
            '<div id="todoTimelineTableContainer"><table id="todoTimelineTable" cellspacing="0" cellpadding="0">' +
            '<tr class="th">' +
            '<th>10:00</th>' +
            '<th>10:30</th>' +
            '<th>11:00</th>' +
            '<th>11:30</th>' +
            '<th>12:00</th>' +
            '<th>12:30</th>' +
            '<th>13:00</th>' +
            '<th>13:30</th>' +
            '<th>14:00</th>' +
            '<th>14:30</th>' +
            '<th>15:00</th>' +
            '<th>15:30</th>' +
            '<th>16:00</th>' +
            '<th>16:30</th>' +
            '<th>17:00</th>' +
            '<th>17:30</th>' +
            '<th>18:00</th>' +
            '<th>18:30</th>' +
            '</tr>' +
            '</table></div>' +
            '</div>' +
            '<div>' +
            '<div>TODO today: <input id="newTODOHour"> hours <button id="refreshAutoHourButton">Refresh Auto Hour</button><button id="printToEmail">Print To Email Format</button><button id="showAll" class="hide">Print to Email</button><button id="printToBasecamp">Print to BaseCamp</button><button id="gotoBasecamp">Go to Base Camp Site</button></div>' +
            '<div id="dailyUpdateTeam">Team memebers: </div>' +
            '</div>' +
            '<div id="formatResult" style="display:none"><input id="baseCampUrl" type="text"><button id="setBaseCampURLButton">Set BaseCamp URL</button><textarea></textarea></div>' +
            '<div id="emailResult" class="hide"><iframe></iframe></div>' +
            '<div id="dailyUpdateTableContainer"><table id="dailyUpdateTable" cellspacing="0"><tr><th>Rank</th><th style="width: 350px">User Story<span id="UserStoryHead"></th><th style="width: 450px">Task<span id="TaskHead"></th></th><th>Owner</th><th>Status</th><th>Remaining <span id="RemainingHead"/></th><th class="todoHourTH">TODO <span class="TODOHead"/></th><th class="todoHourEmailTH hide">TODO  <span class="TODOHead"/></th></tr></table></div></div>')
        var userStories = new Array();

        $("#newTODOHour").val(localStorage.todoToday);

        function printTask(userStoryTitle, userStoryCount, tasks, userStoryIDs, taskIDs, index, owners, hours, status) {
            var number = parseInt(hours);
            if (!number) {
                number = 0;
            }
            remainingHour += number;
            allTaskHours.push(number);
            var checkbox = "<input type='checkbox' class='taskCheckBox' id='task" + allTaskIndex + "'>";
            allTaskIndex++;
            var selectHtml = generateTodoHourOptions(number);
            $("#dailyUpdateResult table#dailyUpdateTable").append("<tr style='width: 350px' class='userStory" + userStoryCount + "' taskID ='" + taskIDs[index] + "' userStoryID = '" + userStoryIDs[index] + "'><td>" + rank + "</td><td class='userStoryTD'>" + userStoryTitle + "</td><td class='task'>" + checkbox + "<a class='taskLink'>" + tasks[index] + "</a></td><td class='dailyUpdateOwner'>" + owners[index] + "</td><td>" + status + "</td><td style='text-align: center'>" + hours + "</td><td class='todoHourTD'>" + selectHtml + "</td><td class='todoHourEmailTD hide'></td></tr>")
        }

        $(".pbi-title").each(function () {
            // add user story
            var userStoryTitle = $(this).attr("title");
            // not started task
            var notStartedTasks;
            var notStartedTasksEst;
            var notStartedTasksOwner;
            var notStartedTaskIDs;
            var notStartedUserStoryIDs;

            $(this).parents("tr").find(".status-NotStarted").each(function () {
                // task title
                notStartedTasks = getTasks(this)

                // task est
                notStartedTasksEst = getEsts(this);

                // task owner
                notStartedTasksOwner = getOwner(this);

                // task id
                notStartedTaskIDs = getOrginalTaskID(this);

                // user story id
                notStartedUserStoryIDs = getUserStoryTaskID(this);
            })

            // impeded
            var impededTasks;
            var impededTasksEst;
            var impededTasksOwner;
            var impededTaskIDs;
            var impededUserStoryIDs;

            $(this).parents("tr").find(".status-Impeded").each(function () {
                // task title
                impededTasks = getTasks(this);

                impededTasksEst = getEsts(this);
                // task est

                // task owner
                impededTasksOwner = getOwner(this);

                // task id
                impededTaskIDs = getOrginalTaskID(this);

                // user story id
                impededUserStoryIDs = getUserStoryTaskID(this);
            })


            // in progress task
            var inProgressTasks;
            var inProgressTasksEst;
            var inProgressTasksOwner;
            var inProgressTaskIDs;
            var inProgressUserStoryIDs;

            $(this).parents("tr").find(".status-InProgress").each(function () {
                // task title
                inProgressTasks = getTasks(this);

                // task est
                inProgressTasksEst = getEsts(this);

                // task owner
                inProgressTasksOwner = getOwner(this);

                // task id
                inProgressTaskIDs = getOrginalTaskID(this);

                // user story id
                inProgressUserStoryIDs = getUserStoryTaskID(this);
            })

            if (notStartedTasks.length + impededTasks.length + inProgressTasks.length) {
                userStories.push(userStoryTitle);
                userStoryCount++;
                for (var index in inProgressTasks) {
                    var inProgressTasksEstHour = inProgressTasksEst[index];
                    printTask(userStoryTitle, userStoryCount, inProgressTasks, inProgressUserStoryIDs, inProgressTaskIDs, index, inProgressTasksOwner, inProgressTasksEstHour, "In Progress");
                    rank++;
                }
                for (var index in impededTasks) {
                    var impededTasksEstHour = impededTasksEst[index];
                    printTask(userStoryTitle, userStoryCount, impededTasks, impededUserStoryIDs, impededTaskIDs, index, impededTasksOwner, impededTasksEstHour, "Blocked");
                    rank++;
                }
                for (var index in notStartedTasks) {
                    var notStartedTasksEstHour = notStartedTasksEst[index];
                    printTask(userStoryTitle, userStoryCount, notStartedTasks, notStartedUserStoryIDs, notStartedTaskIDs, index, notStartedTasksOwner, notStartedTasksEstHour, "Not Started");
                    rank++;
                }
            }

            $("select.todoHour").each(function() {
                $(this).val($(this).find("option:last").text());
            })
        })
        $("#dailyUpdateTableContainer select").change(refreshTheTodoHead).css("display", "none");

        $(".dailyUpdateOwner:contains('ADD_OWNER')").html("<a class='addOwnerLink'>ADD OWNER</a>");

        $("#RemainingHead").text("(" + remainingHour + ")");

        printAllTeamMemebers();

        function getTaskHour(checkBoxID) {
            var taskHour = $("#" + checkBoxID).parents("tr").find("select").val();
            return parseInt(taskHour) || 0;
        }

        function refreshTheTodoHead() {
            todoHour = 0;
            teamMemberHours = {};

            $("tr[selected]").each(function () {
                var teamMember = $(this).find(".dailyUpdateOwner").text();
                var taskHour = getTaskHour($(this).find("input").attr("id"));
                var teamMemberHourID = teamMember.replace(" ", "_");
                if (!teamMemberHours[teamMemberHourID]) {
                    teamMemberHours[teamMemberHourID] = 0;
                }
                teamMemberHours[teamMemberHourID] += taskHour;
                console.log(teamMemberHours);
                todoHour += taskHour;
            });

            for(var index in allTeamMembers) {
                var teamMemberHourID = allTeamMembers[index].replace(" ", "_");
                $("#teamMemberHour" + teamMemberHourID).html(teamMemberHours[teamMemberHourID]);
            }
            $(".TODOHead").text("(" + todoHour + ")");
        }

        function hideTheTodoHourSelect() {
            $(this).parents("tr").find("select").css("display", "none");
            $(this).parents("tr").find(".increase").css("display", "none");
            $(this).parents("tr").find(".decrease").css("display", "none");
        }

        function showTheTodoHourSelect() {
            $(this).parents("tr").find("select").css("display", "inline-block");
            $(this).parents("tr").find(".increase").css("display", "inline-block");
            $(this).parents("tr").find(".decrease").css("display", "inline-block");
        }

        $(".taskCheckBox").click(function (event) {
            if ($(this).parents("tr").attr("selected")) {
                hideTheTodoHourSelect.call(this);
                $(this).parents("tr").removeAttr("selected");
            } else {
                $(this).parents("tr").attr("selected", "selected");
                showTheTodoHourSelect.call(this);
            }
            refreshTheTodoHead();
            event.stopPropagation();
        });

        function autoHour() {
            var $taskCheckBox = $(".taskCheckBox");
            for (var index = 0; index < $taskCheckBox.length; index++) {
                if (todoHour < todayHour) {
                    $taskCheckBox[index].click();
                }
            }
        }

        autoHour();

        function generateTodoHourOptions(number) {
            var result = "";
            if (!number) {
                return result;
            }
            result = "<button class='decrease' style='display: none'>&or;</button><select class='todoHour'>";
            for (var option = 1; option <= number; option++) {
                result += "<option>" + option + "</option>";
            }
            result += "</select><button class='increase' style='display: none'>&and;</button>";
            return result;
        }

        function refreshAutoHour() {
            todayHour = parseInt($("#newTODOHour").val());
            todoHour = 0;
//            $(".taskCheckBox").each(function () {
//                $(this).removeAttr("checked");
//                $(this).parents("tr").removeAttr("selected");
//            })
//            autoHour();

            localStorage.todoToday = todayHour;
            $("#closeDailyUpdateButton").click();
            $("#displayDailyUpdateButton").click();
        }

        $("#refreshAutoHourButton").click(refreshAutoHour);


        function formatBaseCamp(rows) {
            var d = new Date();
            var curr_date = d.getDate();
            var curr_month = d.getMonth() + 1; //Months are zero based
            var curr_year = d.getFullYear();

            var date = curr_year + "-" + curr_month + "-" + curr_date;
            var head = "h2. " + date + " User Story Tasks TODO\n";
            var openUserStory = "**Open User Stories : " + userStoryCount + "**\n";
            var openTasks = "**Open Tasks : " + allTaskIndex + "**\n";
            var head = "h2. " + date + " User Story Tasks\n";
            var tableHead = "| *Rank* | *User Story* | *Task* | *Owner* | *Status* | *Remaining(" + remainingHour + ")* | *Todo(" + todoHour + ")* |\n";
            var rowPrint = "";
            for (var index in rows) {
                var task = rows[index];
                rowPrint += "| " + task.rank + " " + "| " + task.userStory + " " + "| " + task.task + " " + "| " + task.owner + " " + "| " + task.status + " " + "| " + task.remaining + " " + "| " + task.todo + " |\n";
            }

            return head + openUserStory + openTasks + tableHead + rowPrint;
        }

        function printToBaseCamp() {
            var rows = new Array();
            $("tr[selected]").each(function () {
                var allTd = $(this).find("td");
                var rankValue = $(allTd[0]).text();
                var userStoryValue = $(allTd[1]).text();
                var taskValue = $(allTd[2]).text();
                var ownerValue = $(allTd[3]).text();
                var statusValue = $(allTd[4]).text();
                var remainingValue = $(allTd[5]).text();
                var todoValue = $(allTd[6]).find("select").val() || "-";

                var task = {
                    rank: rankValue,
                    userStory: userStoryValue,
                    task: taskValue,
                    owner: ownerValue,
                    status: statusValue,
                    remaining: remainingValue,
                    todo: todoValue
                }

                rows.push(task);
            });

            var toPrint = formatBaseCamp(rows);

            $("#formatResult").css("display","block").find("textarea").val(toPrint).focus().select();

            $("#printToBasecamp").css("display", "none");
            $("#gotoBasecamp").css("display", "inline-block");
        }

        $("#printToBasecamp").click(printToBaseCamp);
        $("#gotoBasecamp").click(function() {
            if(localStorage.baseCampUrl) {
                window.open(localStorage.baseCampUrl + "#comment_body", "_blank");
            } else {
                window.open("https://starcite.basecamphq.com/projects/", "_blank");
            }

            $("#formatResult").css("display", "none");
            $("#gotoBasecamp").css("display", "none");
            $("#printToBasecamp").css("display", "inline-block");
        });

        function printToEmail() {
            $("#dailyUpdateTable tr:not(:first)").not("tr[selected]").addClass("hide");
            $("#dailyUpdateTable input:checkbox").addClass("hide");
            $(".deleteTimeLineTask").addClass("hide");

            $("#dailyUpdateTable tr:first").append("<th>DONE?</th>");
            $("#dailyUpdateTable tr:not(tr:first)").append("<td>&nbsp;</td>");
            $("#printToEmail").addClass("hide");
            $("#showAll").removeClass("hide");

            $("#emailResult iframe").removeClass("hide").html($("#dailyUpdateTableContainer").html());

            $(".todoHourEmailTH").removeClass("hide");
            $(".todoHourEmailTD").removeClass("hide");


            $(".todoHourTD").each(function() {
                $(this).parents("tr").find(".todoHourEmailTD").text("-");
            });
            $(".todoHourTD select").each(function() {
                $(this).parents("tr").find(".todoHourEmailTD").text($(this).val());
            })

            $(".todoHourTH").addClass("hide");
            $(".todoHourTD").addClass("hide");
            $("#dailyUpdateTable .add-task").css("display", "none");

            $("#TaskHead").text(" (" + $("tr[selected]").length + ")");
            showAll();
        }

        function showAll() {
            localStorage.sendToEmail = $("#todoTimelineTableContainer").html() + $("#dailyUpdateTableContainer").html();
            window.open(location.href, "_blank");

            $("#TaskHead").text(" (" + allTaskIndex + ")");

            $("#dailyUpdateTable tr:not(:first)").not("tr[selected]").removeClass("hide");
            $("#dailyUpdateTable input:checkbox").removeClass("hide");

            $("#dailyUpdateTable tr").each(function() {
                $(this).find("td:last").remove();
                $(this).find("th:last").remove();
            })
            $("#printToEmail").removeClass("hide");
            $("#showAll").addClass("hide");

            $(".todoHourEmailTH").addClass("hide");
            $(".todoHourEmailTD").addClass("hide");

            $(".todoHourTH").removeClass("hide");
            $(".todoHourTD").removeClass("hide");
            $(".deleteTimeLineTask").removeClass("hide");
            $("#dailyUpdateTable .add-task").css("display", "inline-block");
        }

        $("td.task").click(function() {
            var checkbox = $(this).find("input");
            checkbox.click();
        })

        $("#printToEmail").click(printToEmail);
        $("#showAll").click(showAll);

        $(".taskLink").each(function() {
            var taskID = $(this).parents("tr").attr("taskid");
            var link = "#" + taskID;
            $(this).attr("onclick", "$('" + link + " a').click(); event.stopPropagation(); setTimeout(function(){$('.ui-button-text').attr('onclick','$(\".tab-header .refresh-icon\").click();setTimeout(function(){$(\"#displayDailyUpdateButton\").click()}, 2000)');}, 200)");
        });

        $(".addOwnerLink").attr("onclick", "$(this).parents('tr').find('.task a').click();");

        $(".increase").click(function() {
            var select = $(this).siblings("select");
            if (select.find("option:last").text() != select.val()) {
                var newHour = parseInt(select.val()) + 1;
                select.val(newHour);
                refreshTheTodoHead();
            }
        })

        $(".decrease").click(function() {
            var select = $(this).siblings("select");
            if (select.find("option:first").text() != select.val()) {
                var newHour = parseInt(select.val()) - 1;
                select.val(newHour);
                refreshTheTodoHead();
            }
        })

        $("#UserStoryHead").text(" (" + userStoryCount + ")");
        $("#TaskHead").text(" (" + allTaskIndex + ")");

        function addTask() {
            var userStoryID = $(this).parents("tr").attr("userStoryID");
            $("#" + userStoryID + " .add-task").click();
        }

        var addTaskIcon = '<div style="display: inline-block; float: none;" onclick="var userStoryID = $(this).parents(\'tr\').attr(\'userStoryID\');$(\'#\' + userStoryID + \' .add-task\').click();" class="add-task scrumworks-button ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only" title="Add a Task to this Backlog Item"><span class="ui-button-icon scrumworks-icon add-task-icon"></span></div>';
        for(var index = 1; index <= userStoryCount; index++) {
            $("tr.userStory" + index + ":first td.userStoryTD").append(addTaskIcon);
        }


        // time line task

        var timeLineTasks = {};
        var maxTimeLineTasks = 0;

        function loadFromLocalStorage() {
            if (localStorage.timeLineTasks) {
                timeLineTasks = JSON.parse(localStorage.timeLineTasks);
            }

            if (localStorage.maxTimeLineTasks) {
                maxTimeLineTasks = localStorage.maxTimeLineTasks;
            }
        }

        function saveToLocalStorage() {
            localStorage.timeLineTasks = JSON.stringify(timeLineTasks);
            localStorage.maxTimeLineTasks = maxTimeLineTasks;
        }

        function addNewTimelineTask() {
            var taskName = $("#timeLineTask").val();
            if (!taskName) {
                return;
            }

            var key = $("#timeLineTaskHour").val();

            var tasks = timeLineTasks[key];
            if (!tasks) {
                tasks = new Array();
                timeLineTasks[key] = tasks;
            }
            tasks.push(taskName);
            printAllTimeLineTask();
            showHideTimeLineTable();
            $("#timeLineTask").val("").focus();
            saveToLocalStorage();
        }

        function printAllTimeLineTask() {
            // clear the print result
            updateMaxTimeLineTasks();
            $("#todoTimeline tr:not(.th)").remove();
            for(var index = 0; index < maxTimeLineTasks; index++) {
                $("#todoTimeline table").append("<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>");
            }


            $("#timeLineTaskHour option").each(function() {
                var value = $(this).attr("value");
                var tasks = timeLineTasks[value];
                var tdIndex = $(this).index();

                if(tasks) {
                    $("#todoTimeline table tr").each(function() {
                        $(this).find("th:eq(" + tdIndex + ")").removeClass("hide");
                        $(this).find("td:eq(" + tdIndex + ")").removeClass("hide");
                    })
                    for (var index = 0; index < tasks.length; index++) {
                        var trIndex = 1 + index;
                        $("#todoTimeline table tr:eq(" + trIndex + ") td:eq(" + tdIndex + ")").replaceWith("<td class='timeLineTask'><span href='###' class='deleteTimeLineTask'>[X]</span><span trIndex='" + trIndex + "' tdIndex='" + tdIndex + "'> " + tasks[index] + "</span></td>");
                    }
                } else {
                    $("#todoTimeline table tr").each(function() {
                        $(this).find("th:eq(" + tdIndex + ")").addClass("hide");
                        $(this).find("td:eq(" + tdIndex + ")").addClass("hide");
                    })
                }
            });
        }

        function removeTimeLineTask() {
            // update the timeLineTasks && maxTimeLineTasks
            var task = $(this).next("span");
            var tdIndex = task.attr("tdIndex");
            var trIndex = task.attr("trIndex");

            var key = $("#timeLineTaskHour option:eq(" + tdIndex + ")").val();
            timeLineTasks[key].splice(-1 + trIndex, 1);
            if (timeLineTasks[key].length == 0) {
                delete timeLineTasks[key];
            }
            printAllTimeLineTask();
            showHideTimeLineTable();
            saveToLocalStorage();
        }

        function updateMaxTimeLineTasks() {
            maxTimeLineTasks = 0;

            $("#timeLineTaskHour option").each(function() {
                var value = $(this).attr("value");
                var tasks = timeLineTasks[value];

                if(tasks) {
                    if(tasks.length > maxTimeLineTasks) {
                        maxTimeLineTasks = tasks.length;
                    }
                }
            });
        }

        $(document).on("click", ".deleteTimeLineTask", removeTimeLineTask);

        function showHideTimeLineTable() {
            if(!maxTimeLineTasks) {
                $("#todoTimeline table").addClass("hide");
            } else {
                $("#todoTimeline table").removeClass("hide");
            }
        }

        loadFromLocalStorage();
        printAllTimeLineTask();
        showHideTimeLineTable();
        $("#addTimeLineTaskButton").click(addNewTimelineTask);

        $("#clearAllTimeLineTasksButton").click(function() {
            maxTimeLineTasks = 0;
            timeLineTasks = {};
            printAllTimeLineTask();
            showHideTimeLineTable();
            saveToLocalStorage();
        })

        $("#setBaseCampURLButton").click(function() {
            localStorage.baseCampUrl = $("#baseCampUrl").val();
        })

        $("#baseCampUrl").val(localStorage.baseCampUrl);
    }


    $("#displayDailyUpdateButton").click(displayDailyUpdateTable);
})


