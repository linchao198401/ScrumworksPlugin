/* The contents of these files or directories (including all sub-directories)
 are subject to the ScrumWorks(R) Pro Software License
 ("License"); you may not use these files except in compliance with the
 License. See the License for the specific language governing rights and
 limitations under the License. The licensed Software is: ScrumWorks(R) Pro.
 The developer and owner of the Software is CollabNet, Inc. Portions created
 by CollabNet, Inc. are Copyright (c) 2012 CollabNet, Inc.; All Rights
 Reserved.
 */
Taskboard = new TaskboardHandler(WebClient, Messages, TaskEditors);
function TaskboardHandler(webClientHandler, messageLoader, taskEditors) {
    this.webClient = webClientHandler;
    this.messages = messageLoader;
    this.updatePoller = this.webClient.createPollingInstance(this.webClient, this.messages);
    this.sprintId = 0;
    this.clientId = 0;
    this.teamId = 0;
    this.teamMembers = {};
    this.teamMembersById = {};
    this.permissions = {};
    this.taskEditors = taskEditors;
    var me = this;
    this.taskEditors.editorOptions = {afterOpen: function (taskEditor) {
        var taskId = me.taskEditors.getTaskId(taskEditor);
        var taskWidget = me.getTaskWidget(taskId);
        me.associateTaskEditorAndWidget(taskEditor, taskWidget);
    }, beforeSave: function (taskEditor) {
        var taskWidget = me.getTaskWidgetForTaskEditor(taskEditor);
        if (taskWidget) {
            taskWidget.addClass('pending');
        }
    }, beforeClose: function (taskEditor) {
        var taskWidget = me.getTaskWidgetForTaskEditor(taskEditor);
        if (taskWidget) {
            taskWidget.removeData('editor');
        }
    }, afterSave: function (taskEditor) {
        var taskWidget = me.getTaskWidgetForTaskEditor(taskEditor);
        if (taskWidget) {
            taskWidget.removeClass('pending');
        }
    }, taskUpdated: function (task) {
        me.updateTaskWidget(task);
    }, taskCreated: function (task) {
        var emptyTaskWidget = $(me.createTaskWidgetHTML(task));
        $('#taskboardTable').append(emptyTaskWidget);
        me.updateTaskWidget(task, emptyTaskWidget);
    }, taskDeleted: function (taskEditor) {
        var taskWidget = me.getTaskWidgetForTaskEditor(taskEditor);
        var table = taskWidget.parents('table');
        taskWidget.remove();
        me.updateSummaries(table, true);
    }};
    this.setTaskStatuses = function (taskStatuses) {
        this.taskStatuses = taskStatuses;
    };
    this.setTeamMembers = function (teamMembers) {
        this.teamMembers = teamMembers;
        this.teamMembersById = {};
        for (teamMemberName in teamMembers) {
            var highlightInfo = teamMembers[teamMemberName];
            this.teamMembersById[highlightInfo.id] = highlightInfo;
        }
    };
    this.setSelectedTeam = function (teamId) {
        this.teamId = teamId;
    };
    this.setPermissions = function (permissions) {
        this.permissions = permissions;
        this.taskEditors.permissions = permissions;
    };
    this.addHighlightSelectorListeners = function (dropdown) {
        me.webClient.addOptionSelectorListener(dropdown, function () {
            me.saveHighlightSettings();
        });
        $('#highlight-all').click(function () {
            me.webClient.checkAll('#team-member-list');
            me.highlightTasks($('#taskboardTable'), {highlightedUserIds: me.getHighlightedIdsFromCheckboxes()});
        });
        $('#highlight-none').click(function () {
            var unchecked = me.webClient.uncheckAll('#team-member-list');
            me.clearHighlightTasks($('#taskboardTable'));
        });
        me.getTeamMemberList().find('input').change(function () {
            var checkbox = $(this);
            var isChecked = checkbox.is(':checked');
            var teamMemberId = checkbox.val();
            var highlightInfo = me.teamMembersById[teamMemberId];
            if (highlightInfo) {
                var table = $('#taskboardTable');
                me.setHighlightForPointPerson(table, highlightInfo, isChecked);
            }
        });
    };
    this.buildTeamMemberList = function (teamMembers, highlightedUserIds) {
        var highlightUnspecified = $.inArray('unspecified', highlightedUserIds) >= 0 ? 'checked=checked' : '';
        var html = ['<span id="highlight-all" class="clickable">', this.messages.get("highlight.select.all"), '</span>', '<span class="vertical-separator"> | </span>', '<span id="highlight-none" class="clickable">', this.messages.get("highlight.select.none"), '</span>', '<ul id="team-member-list">', '<li class="team-member-row">', '<div class="highlight-checkbox-background team-member-unspecified">', "<input type='checkbox' value='unspecified' id='highlight-option-unspecified' ", highlightUnspecified, " />", '</div>', '<label for="highlight-option-unspecified">', this.messages.get("task.pointperson.none"), '</label>', '</li>'];
        for (teamMemberName in teamMembers) {
            var teamMember = teamMembers[teamMemberName];
            if (teamMemberName != "null") {
                var userIdIndex = $.inArray(teamMember.id, highlightedUserIds);
                var checked = userIdIndex >= 0 ? 'checked=checked' : '';
                var teamMemberRow = ['<li class="team-member-row">', '<div class="highlight-checkbox-background ', teamMember.cssRule, '">', '<input id="highlight-option-', teamMember.id, '" type="checkbox" value="', teamMember.id, '" ', 'class="highlight-checkbox" ', checked, ' />', '</div>', '<label for="highlight-option-', teamMember.id, '">', teamMemberName, '</label>', '</li>'];
                html.push(teamMemberRow.join(''));
            }
        }
        html.push('</ul>');
        return html.join('');
    };
    this.getTeamMemberList = function () {
        return $('#team-member-list');
    };
    this.getHighlightedIdsFromCheckboxes = function () {
        var array = this.getTeamMemberList().find('input:checked').map(function (idx, checkbox) {
            return $(checkbox).val();
        });
        return $.makeArray(array);
    };
    this.saveHighlightSettings = function () {
        this.webClient.postJSON('data/task/highlight', this.createTaskHighlightData(this.teamId), null);
    };
    this.createTaskHighlightData = function (teamId) {
        var teamMemberList = me.getTeamMemberList();
        var highlightUnspecified = teamMemberList.find('#highlight-option-unspecified').is(':checked');
        var checked = teamMemberList.find('input.highlight-checkbox:checked');
        var highlightedUserIds = [];
        checked.each(function (idx, checkBox) {
            highlightedUserIds.push($(checkBox).val());
        });
        var data = {teamId: teamId, highlightUnspecified: highlightUnspecified, highlightedUserIds: highlightedUserIds};
        return data;
    };
    this.loadTasks = function (sprintId, clientId, highlightSettings, table) {
        this.sprintId = sprintId;
        this.clientId = clientId;
        var success = function (tasksInBacklogItems) {
            var html = me.createBacklogItemRows(tasksInBacklogItems);
            $(document).ready(function () {
                table.find('tbody').html(html);
                me.configureTaskboard(table, highlightSettings);
            });
        };
        this.webClient.getJSON('data/sprint/' + sprintId + '/tasks/' + clientId, success);
        me.addTaskListeners(table);
    };
    this.highlightTasks = function (table, highlightSettings) {
        if ($.browser.msie && $.browser.version <= 7) {
            this.highlightTasksIE7(table, highlightSettings);
        } else {
            var highlightedUserIds = highlightSettings.highlightedUserIds;
            for (var i = 0; i < highlightedUserIds.length; i++) {
                var teamMemberInfo = this.teamMembersById[highlightedUserIds[i]];
                if (teamMemberInfo) {
                    this.setHighlightForPointPerson(table, teamMemberInfo, true);
                }
            }
        }
    };
    this.highlightTasksIE7 = function (table, highlightSettings) {
        var highlights = {};
        var highlightedUserIds = highlightSettings.highlightedUserIds;
        for (var i = 0; i < highlightedUserIds.length; i++) {
            var teamMemberInfo = this.teamMembersById[highlightedUserIds[i]];
            highlights[teamMemberInfo.id] = teamMemberInfo.cssRule;
        }
        var divs = table.find('div.taskboard-task');
        var matcher = /task-point-person-(-?[a-z0-9]+)/;
        for (var j = 0; j < divs.length; j++) {
            var div = divs[j];
            var match = div.className.match(matcher);
            if (match && match[1]) {
                var highlightClass = highlights[match[1]];
                if (highlightClass && div.className.indexOf(highlightClass) < 0) {
                    div.className += ' ' + highlightClass;
                }
            }
        }
    };
    this.clearHighlightTasks = function (parent) {
        var divs = parent.find('div.taskboard-task');
        var matcher = /team-member-([0-9]{1,2}|unspecified)/;
        for (var j = 0; j < divs.length; j++) {
            var div = divs[j];
            div.className = div.className.replace(matcher, '');
        }
    };
    this.setHighlightForPointPerson = function (parent, teamMemberInfo, enabled) {
        var taskWidgets = parent.find('div.task-point-person-' + teamMemberInfo.id);
        if (enabled) {
            taskWidgets.addClass(teamMemberInfo.cssRule);
        } else {
            taskWidgets.removeClass(teamMemberInfo.cssRule);
        }
    };
    this.pollServer = function (table) {
        var indicator = $('.force-refresh');
        var callback = function (data) {
            return me.applyUpdates(data, table);
        };
        var query = 'data/sprint/' + this.sprintId + '/updates/' + this.clientId;
        this.updatePoller.startUpdates(query, (30 * 1000), indicator, callback);
    };
    this.updateHasRowChanges = function (updates, table) {
        var pbiIds = updates.backlogItemsInSprint;
        var currentPBIs = table.find('.taskboard-pbi-row');
        var newCount = pbiIds.length;
        var currentCount = currentPBIs.length;
        var rowChange = (newCount != currentCount);
        currentPBIs.each(function (index, rowElement) {
            var row = $(rowElement);
            var rowId = me.webClient.findIDFromElement(row);
            rowChange = rowChange || (pbiIds[index] !== rowId);
        });
        return rowChange;
    };
    this.applyBacklogItemUpdates = function (updatedBacklogItems, table) {
        var newRows = {};
        for (var i = 0; i < updatedBacklogItems.length; i++) {
            var tasksForBacklogItem = updatedBacklogItems[i];
            var backlogItemId = tasksForBacklogItem.backlogItem.id;
            var backlogItemRow = this.findBacklogItemRowByID(backlogItemId, table);
            var rowExists = !!(backlogItemRow.length);
            if (rowExists) {
                this.updateBacklogItemRow(tasksForBacklogItem, backlogItemRow);
            } else {
                newRows[backlogItemId] = this.createBacklogItemRow(tasksForBacklogItem);
            }
        }
        return newRows;
    };
    this.updateBacklogItemRow = function (tasksForBacklogItem, backlogItemRow) {
        var backlogItem = tasksForBacklogItem.backlogItem;
        var pbiInfo = backlogItemRow.find('.taskboard-pbi');
        this.updateBacklogItemInfo(pbiInfo, backlogItem);
        $(tasksForBacklogItem.tasksByStatuses).each(function (index, tasksByStatus) {
            me.updateTaskColumn(backlogItemRow, tasksByStatus);
        });
    };
    this.updateTaskColumn = function (backlogItemRow, tasksByStatus) {
        var column = backlogItemRow.find(this.getSelectorForStatusColumn(tasksByStatus.status));
        column.removeAttr('style');
        column.html(this.createTasks(tasksByStatus.tasks));
    };
    this.rearrangeBacklogItemRows = function (pbiIds, newRows, table) {
        var tableBody = table.find('tbody');
        var existingPBIs = me.detachBacklogItemRows(tableBody);
        var rows = $.extend({}, existingPBIs, newRows);
        var success = me.appendBacklogItemRows(tableBody, pbiIds, rows);
        return success;
    };
    this.detachBacklogItemRows = function (tableBody) {
        var originalRows = tableBody.find('tr').detach();
        var existingPBIs = {};
        originalRows.filter('.taskboard-pbi-row').each(function (index, rowElement) {
            var row = $(rowElement);
            var rowId = me.webClient.findIDFromElement(row);
            existingPBIs[rowId] = row;
        });
        return existingPBIs;
    };
    this.appendBacklogItemRows = function (tableBody, rowOrder, rows) {
        for (var i = 0; i < rowOrder.length; i++) {
            tableBody.append(this.getSpacerRowHTML(i));
            var backlogItemId = rowOrder[i];
            var row = rows[backlogItemId];
            if (row) {
                tableBody.append(row);
            } else {
                return false;
            }
        }
        tableBody.append(this.getBottomSpacerRowHTML());
        return true;
    };
    this.getSpacerRowHTML = function (beforePBIRow) {
        if (beforePBIRow == 0) {
            return this.getEmptySpacerRowHTML('first-row-spacer-cell');
        } else {
            var spacerRowHTMLArray = ['<tr>'];
            var columnTexts = $($.merge([this.messages.get('backlog.item.column.caption')], this.taskStatuses));
            columnTexts.each(function (index, columnText) {
                var borderClass = '';
                if (index == 0) {
                    borderClass = 'first-cell';
                } else if (columnTexts.length == index + 1) {
                    borderClass = 'last-task-cell';
                }
                spacerRowHTMLArray.push('<td class="row-spacer-cell ', borderClass, '">', columnText.toLowerCase(), '</td>');
            });
            spacerRowHTMLArray.push('</tr>');
            return spacerRowHTMLArray.join('');
        }
    };
    this.getEmptySpacerRowHTML = function (spacerCellClass) {
        return['<tr><td class="', spacerCellClass, '" colspan="', (this.taskStatuses.length + 1), '"/></tr>'].join('');
    };
    this.getBottomSpacerRowHTML = function () {
        return this.getEmptySpacerRowHTML('bottom-row-spacer-cell');
    };
    this.cleanUpOrphanedBacklogItemRows = function (originalPBIs) {
        originalPBIs.each(function (index, element) {
            var row = $(element);
            if (row.parent().length == 0) {
                row.remove();
            }
        });
    };
    this.applyUpdates = function (updates, table) {
        var pbisChanged = !!(updates.updatedBacklogItems.length);
        var rowsChanged = me.updateHasRowChanges(updates, table);
        if (!pbisChanged && !rowsChanged) {
            return true;
        } else {
            var pbiIds = updates.backlogItemsInSprint;
            var newRows = me.applyBacklogItemUpdates(updates.updatedBacklogItems, table);
            var success = true;
            if (rowsChanged) {
                var originalPBIs = table.find('.taskboard-pbi-row');
                success = me.rearrangeBacklogItemRows(pbiIds, newRows, table);
                me.cleanUpOrphanedBacklogItemRows(originalPBIs);
                me.updateTaskboard(table);
            } else {
                me.fixTableCellHeights(table);
                me.updateSummaries(table, true);
            }
            me.updateTaskEditors(updates, table);
            me.updateTaskHighlight(updates.updatedBacklogItems, table);
            return success;
        }
    };
    this.updateTaskEditors = function (updates, table) {
        $('.task-editor').each(function (index, editorElement) {
            me.updateTaskEditor($(editorElement), updates, table);
        });
    };
    this.updateTaskHighlight = function (updatedBacklogItems, table) {
        var highlightedIds = me.getHighlightedIdsFromCheckboxes();
        $.each(updatedBacklogItems, function (idx, tasksForBacklogItem) {
            var backlogItemRow = me.findBacklogItemRowByID(tasksForBacklogItem.backlogItem.id, table);
            me.highlightTasks(backlogItemRow, {highlightedUserIds: highlightedIds});
        });
    };
    this.updateTaskEditor = function (taskEditor, updates, table) {
        var oldWidget = me.getTaskWidgetForTaskEditor(taskEditor);
        if (oldWidget.parents('table').length == 0) {
            var taskId = me.webClient.findIDFromElement(oldWidget);
            var taskWidget = me.getTaskWidget(taskId);
            if (taskWidget.length > 0) {
                me.associateTaskEditorAndWidget(taskEditor, taskWidget);
                if ($.inArray(taskId, updates.updatedTasks) !== -1) {
                    me.webClient.showEditorMessage(taskEditor, me.messages.get('server.update.task.changed'));
                }
            } else {
                me.updateTaskEditorWithRemovedTask(taskEditor, taskId, updates);
            }
        }
    };
    this.updateTaskEditorWithRemovedTask = function (taskEditor, taskId, updates) {
        var backlogItemDeleted = $.inArray(taskEditor.data('backlogItemId'), updates.deletedBacklogItems) !== -1;
        var taskDeleted = $.inArray(taskId, updates.deletedTasks) !== -1;
        var messageKey = 'server.update.task.moved';
        if (backlogItemDeleted || taskDeleted) {
            messageKey = backlogItemDeleted ? 'server.update.task.item.deleted' : 'server.update.task.deleted';
            this.webClient.disableEditorButton(taskEditor, '.save-button');
        }
        this.webClient.showEditorMessage(taskEditor, me.messages.get(messageKey));
    };
    this.getTaskWidgetForTaskEditor = function (taskEditor) {
        return taskEditor.data('widget');
    };
    this.configureTaskboard = function (table, highlightSettings) {
        var me = this;
        this.updateTaskboard(table, function () {
            me.highlightTasks(table, highlightSettings);
            me.pollServer(table);
        });
    };
    this.updateTaskboard = function (table, onComplete) {
        var buttons = this.webClient.getAsJquery('.add-task', table);
        var enabled = this.permissions.canEditTask;
        this.webClient.configureIconButtons(buttons, enabled);
        this.fixTableCellHeights(table);
        this.updateSummaries(table, true);
        this.initializeDragAndDrop(table);
        if (onComplete) {
            onComplete();
        }
    };
    this.createBacklogItemRows = function (tasksForBacklogItems) {
        var divTexts = [];
        $.each(tasksForBacklogItems, function (index, tasksForBacklogItem) {
            divTexts.push(me.getSpacerRowHTML(index));
            divTexts.push(me.createBacklogItemRow(tasksForBacklogItem));
        });
        divTexts.push(me.getBottomSpacerRowHTML('bottom-row-spacer-cell'));
        return divTexts.join('');
    };
    this.createBacklogItemRow = function (tasksForBacklogItem) {
        var backlogItem = this.messages.sanitizeStringFields(tasksForBacklogItem.backlogItem);
        var description = this.messages.breakLines(backlogItem.description);
        var done = backlogItem.done ? ' done' : '';
        var rowId = 'pbi_' + backlogItem.id;
        var key = backlogItem.key;
        var div = [];
        div.push('<tr id="', rowId, '" class="taskboard-pbi-row">', '<td class="pbi-cell first-cell">');
        div.push('<div class="taskboard-pbi', done, '">');
        div.push('<div class="pbi-body">');
        div.push('<div class="add-task scrumworks-button" title="', this.messages.get('task.add.hint'), '">');
        div.push('<span class="ui-button-icon scrumworks-icon add-task-icon"/>');
        div.push('</div>');
        div.push('<div class="estimate">', this.messages.get('backlog.effort'));
        div.push(' <span class="estimate-value">', this.webClient.estimateToText(backlogItem.estimate), '</span>');
        div.push('</div>');
        div.push('<div class="scrumworks-icon done-icon"></div>');
        div.push('<div class="pbi-key">', this.webClient.getLinkToBacklogItem(key), '</div>');
        div.push('<div class="pbi-title" title="', backlogItem.name, '">', backlogItem.name, '</div>');
        div.push('<div class="comments">', this.messages.get('comments.text', [backlogItem.commentCount]), '</div>');
        div.push('<div class="attachments">', this.messages.get('attachments.text', [backlogItem.attachmentCount]), '</div>');
        div.push('<div class="description">', description, '</div>');
        div.push('</div>');
        div.push('</div></td>');
        div.push(this.createTaskStatusCells(tasksForBacklogItem.tasksByStatuses, key));
        div.push('</tr>');
        return div.join('');
    };
    this.updateBacklogItemInfo = function (taskboardPBI, backlogItemData) {
        var backlogItem = this.messages.sanitizeStringFields(backlogItemData);
        var description = this.messages.breakLines(backlogItem.description);
        if (backlogItem.done) {
            taskboardPBI.addClass('done');
        } else {
            taskboardPBI.removeClass('done');
        }
        this.webClient.setElementText(taskboardPBI, '.estimate-value', this.webClient.estimateToText(backlogItem.estimate));
        taskboardPBI.find('.pbi-key').html(this.webClient.getLinkToBacklogItem(backlogItem.key));
        this.webClient.setElementText(taskboardPBI, '.pbi-title', backlogItem.name, backlogItem.name);
        this.webClient.setElementText(taskboardPBI, '.description', description);
        this.webClient.setElementText(taskboardPBI, '.comments', this.messages.get('comments.text', [backlogItem.commentCount]));
        this.webClient.setElementText(taskboardPBI, '.attachments', this.messages.get('attachments.text', [backlogItem.attachmentCount]));
        taskboardPBI.removeAttr('style');
        return taskboardPBI;
    };
    this.createTaskStatusCells = function (tasksByStatuses, backlogItemKey) {
        var divTexts = $.map(tasksByStatuses, function (tasksByStatus, index) {
            return me.createTaskStatusCell(tasksByStatus, backlogItemKey, tasksByStatuses.length == index + 1);
        });
        return divTexts.join('');
    };
    this.createTaskStatusCell = function (tasksByStatus, backlogItemKey, isInLastColumn) {
        var statusName = this.formatStatusForID(tasksByStatus.status);
        var columnID = backlogItemKey + '_' + statusName;
        var lastColumnClass = isInLastColumn ? 'last-task-column' : '';
        var div = [];
        div.push('<td class="task-cell ', isInLastColumn ? 'last-task-cell' : '', '">');
        div.push('<div id="', columnID, '" class="taskboard-task-column status-', statusName, ' ', lastColumnClass, '">');
        div.push(this.createTasks(tasksByStatus.tasks));
        div.push('</div>');
        div.push('</td>');
        return div.join('');
    };
    this.updateSummaries = function (table, chart) {
        if (chart) {
            var burndown = table.parent().find('#mini-burndown');
            var paramToForceReload = Math.floor(Math.random() * 1000 * 1000 * 1000);
            burndown.attr('src', 'taskboard/sprintburndown/' + this.sprintId + '/mini?_=' + paramToForceReload);
        }
        var headers = table.find('td.table-task-header-cell');
        for (var i = 0; i < this.taskStatuses.length; i++) {
            var statusName = this.taskStatuses[i];
            var count = this.countTasks(table, statusName);
            var text = this.getTaskCountMessage(count);
            headers.eq(i).find('.task-count').text(text);
        }
    };
    this.countTasks = function (table, statusName) {
        var selector = this.getSelectorForStatusColumn(statusName) + ' div.taskboard-task';
        var tasks = table.find(selector);
        var count = tasks.size() - tasks.filter('.ui-sortable-placeholder').size();
        return count;
    };
    this.getTaskCountMessage = function (count) {
        return count == 1 ? this.messages.get('task.count.one') : this.messages.get('task.count.many', [count]);
    };
    this.createTasks = function (tasks) {
        var divTexts = $.map(tasks, function (task) {
            return me.createTaskWidgetHTML(task);
        });
        return divTexts.join('');
    };
    this.createTaskWidgetHTML = function (task) {
        var cleanedTask = this.messages.sanitizeStringFields(task);
        var pointPerson = this.getPointPersonText(cleanedTask);
        var html = [];
        html.push('<div class="' + this.getTaskWidgetClassNames(cleanedTask) + '" id="task_', cleanedTask.id, '">');
        html.push('<div class="taskboard-task-title compact-text">');
        html.push('<a class="clickable task-edit-link" title="', cleanedTask.title, '">', cleanedTask.title, '</a>');
        html.push('</div>');
        html.push('<div class="taskboard-task-estimate">', this.webClient.estimateToText(cleanedTask.estimate), '</div>');
        html.push('<div class="taskboard-task-point-person" title="', pointPerson, '">', pointPerson, '</div>');
        html.push('</div>');
        return html.join('');
    };
    this.getTaskWidgetClassNames = function (task) {
        return'taskboard-task ui-corner-all ' + this.getPointPersonClass(task);
    };
    this.getPointPersonText = function (task) {
        return(task.pointPerson) ? task.pointPerson : this.messages.get('task.pointperson.none');
    };
    this.getPointPersonClass = function (task) {
        return this.teamMembers[task.pointPerson] ? 'task-point-person-' + this.teamMembers[task.pointPerson].id : '';
    };
    this.addTaskListeners = function (table) {
        table.delegate('.taskboard-pbi .add-task:not(.ui-state-disabled)', 'click', function () {
            me.updatePoller.delayUpdates();
            me.openAddTask($(this).parents('.taskboard-pbi').first());
        });
        table.delegate('.taskboard-task:not(.pending) .task-edit-link', 'click', function () {
            me.updatePoller.delayUpdates();
            me.openTaskEditor($(this).parents('.taskboard-task').first());
        });
    };
    this.findBacklogItemRowByID = function (backlogItemId, target) {
        return target.find('#pbi_' + backlogItemId);
    };
    this.updateTaskWidget = function (task, widget) {
        var widget = widget || this.getTaskWidget(task.id);
        var sanitizedTask = this.messages.sanitizeStringFields(task);
        var table = widget.parents('table');
        widget.attr('id', 'task_' + sanitizedTask.id);
        this.webClient.setElementText(widget, '.taskboard-task-title > a', sanitizedTask.title, sanitizedTask.title);
        var estimate = $(widget.children('.taskboard-task-estimate'));
        estimate.text(this.webClient.estimateToText(sanitizedTask.estimate));
        var pointPersonText = this.getPointPersonText(sanitizedTask);
        this.webClient.setElementText(widget, 'div.taskboard-task-point-person', pointPersonText, pointPersonText);
        this.updateTaskWidgetHighlight(sanitizedTask, widget);
        this.updateTaskWidgetColumn(sanitizedTask, widget);
        this.updateSummaries(table, true);
        return widget;
    };
    this.updateTaskWidgetHighlight = function (task, taskWidget) {
        var cleanedTask = this.messages.sanitizeStringFields(task);
        taskWidget.attr('class', this.getTaskWidgetClassNames(cleanedTask));
        if (this.isPointPersonHighlighted(cleanedTask.pointPerson)) {
            this.setHighlightForPointPerson(taskWidget.parent(), this.teamMembers[cleanedTask.pointPerson], true);
        }
    };
    this.isPointPersonHighlighted = function (pointPerson) {
        var highlightInfo = this.teamMembers[pointPerson];
        return highlightInfo && $('#highlight-option-' + highlightInfo.id).is(':checked');
    };
    this.updateTaskWidgetColumn = function (task, taskWidget) {
        var backlogItemID = task.backlogItemId;
        var table = taskWidget.parents('table');
        var row = this.findBacklogItemRowByID(backlogItemID, table);
        var target = row.find(this.getSelectorForStatusColumn(task.status));
        var parent = taskWidget.parent();
        if (target.attr('id') !== parent.attr('id')) {
            var detachedWidget = taskWidget.detach();
            target.append(detachedWidget);
        }
    };
    this.getSelectorForStatusColumn = function (taskStatus) {
        var statusName = this.formatStatusForID(taskStatus);
        return'div.taskboard-task-column.status-' + statusName;
    };
    this.formatStatusForID = function (status) {
        return status.replace(/ /g, '');
    };
    this.openAddTask = function (backlogItem) {
        var row = backlogItem.parents('.taskboard-pbi-row');
        var pbiID = this.webClient.findIDFromElement(row);
        this.taskEditors.openAddTask(pbiID);
    };
    this.openTaskEditor = function (taskWidget) {
        var taskID = this.webClient.findIDFromElement(taskWidget);
        this.taskEditors.openTaskEditor(taskID);
    };
    this.associateTaskEditorAndWidget = function (taskEditor, taskWidget) {
        taskWidget.data('editor', taskEditor);
        var backlogItemId = this.webClient.findIDFromElement(taskWidget.parents('.taskboard-pbi-row'));
        taskEditor.data('backlogItemId', backlogItemId);
        taskEditor.data('widget', taskWidget);
    };
    this.initializeDragAndDrop = function (table) {
        var widgetHeight = 28;
        if (this.permissions.canEditTask) {
            var selector = '.taskboard-task-column';
            var columns = table.find(selector);
            var configuration = this.webClient.getDragAndDropConfiguration(this, widgetHeight, this.updatePoller);
            configuration.containment = table.selector;
            columns.sortable(configuration);
            columns.sortable({connectWith: selector});
        }
    };
    this.fixTableCellHeights = function (table) {
        var rows = table.find('.taskboard-pbi-row');
        var rowHeights = [];
        rows.each(function (index, element) {
            var row = $(element);
            rowHeights[index] = row.innerHeight();
        });
        rows.each(function (index, element) {
            var row = $(element);
            var height = rowHeights[index];
            row.find('.taskboard-pbi').height(height - 2);
            row.find('.taskboard-task-column').height(height);
        });
    };
    this.checkDropTarget = function (event, ui) {
        return true;
    }
    this.handleDropRequest = function (event, ui) {
        var taskWidget = ui.item;
        var cleanup = function () {
            me.forgetLocation(taskWidget);
            taskWidget.removeClass('pending');
        };
        var success = function (task) {
            me.updateTaskWidget(task);
            cleanup();
        };
        var failure = function (request) {
            me.webClient.showErrorForRequest(request, null, function () {
                me.moveTaskWidgetToOriginalLocation(taskWidget);
                cleanup();
            });
        };
        var taskId = me.webClient.findIDFromElement(taskWidget);
        taskWidget.addClass('pending');
        me.moveTask(taskId, success, failure);
    };
    this.rememberLocation = function (taskWidget) {
        var previousTask = taskWidget.prev('.taskboard-task');
        var previousTaskId = previousTask.attr('id');
        var column = this.getTaskWidgetParentColumnId(taskWidget);
        taskWidget.data('previousTask', previousTaskId);
        taskWidget.data('parentPBI', column);
    };
    this.forgetLocation = function (taskWidget) {
        taskWidget.removeData('previousTask');
        taskWidget.removeData('parentPBI');
    };
    this.getTaskWidgetParentColumnId = function (taskWidget) {
        return taskWidget.parents('.taskboard-task-column').attr('id');
    };
    this.moveTaskWidgetToOriginalLocation = function (taskWidget) {
        var previousTask = taskWidget.data('previousTask');
        if (previousTask) {
            taskWidget.insertAfter('#' + previousTask);
        } else {
            var parentId = taskWidget.data('parentPBI');
            taskWidget.prependTo('#' + parentId);
        }
    };
    this.moveTask = function (taskId, success, failure) {
        var data = this.getMoveTaskData(taskId);
        this.webClient.postJSON("data/task/move", data, success, failure);
    };
    this.getTaskWidget = function (taskId) {
        return $('#task_' + taskId);
    };
    this.getMoveTaskData = function (taskId) {
        var taskWidget = this.getTaskWidget(taskId);
        var previousTask = taskWidget.prev('.taskboard-task');
        var parentContainer = taskWidget.parents('.taskboard-task-column');
        var row = parentContainer.parents('.taskboard-pbi-row');
        var data = {clientId: this.clientId, taskToMoveId: taskId, taskAboveDestinationId: this.webClient.findIDFromElement(previousTask), destinationBacklogItemId: this.webClient.findIDFromElement(row), destinationStatus: this.webClient.findIDFromElement(parentContainer)};
        return data;
    };
    this.openSprintBurndownOverlay = function () {
        var url = window.location.protocol + '//' + window.location.host + contextPath + '/';
        var sprintBurndownPath = "taskboard/sprintburndown/" + sprintId;
        var closeLoadingDialog = this.webClient.loading(this.messages.get('sprint.burndown.loading'));
        var div = $(this.getSprintBurndownOverlayContent(url, sprintBurndownPath));
        var image = $(div.find('img'));
        image.load(function () {
            closeLoadingDialog();
            me.webClient.showOverlay(div);
        });
        image.error(function () {
            closeLoadingDialog();
            me.webClient.alert(me.messages.get('sprint.burndown.load.error'));
        });
    };
    this.getSprintBurndownOverlayContent = function (appRootURL, sprintBurndownPath) {
        var dialogContent = [];
        dialogContent.push('<div>');
        dialogContent.push('<img class="sprint-burndown-image" src="', sprintBurndownPath + '?', new Date().getTime(), '" />');
        dialogContent.push('<div class="sprint-burndown-url">');
        dialogContent.push(this.messages.get('sprint.burndown.share.hint'));
        dialogContent.push('<input type="text" readonly value="', appRootURL, sprintBurndownPath, '"/>');
        dialogContent.push('</div>');
        dialogContent.push('</div>');
        return dialogContent.join('');
    };
}

$("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#aa0000", color: "#fff"}, 500, function () {
    $("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#fff", color: "#000"}, 500, function () {
        $("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#aa0000", color: "#fff"}, 500, function () {
            $("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#fff", color: "#000"}, 500, function(){
                $("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#aa0000", color: "#fff"}, 500, function () {
                    $("#teamMemberHourGrace_Zhou").animate({backgroundColor: "#fff", color: "#000"}, 500);
                });
            });
        });
    });
})