var GmailToTrello = GmailToTrello || {};

GmailToTrello.PopupView = function() {

    this.event = new EventTarget();
    this.isInitialized = false;

    this.data = null;

    this.MIN_WIDTH = 450;
    this.MAX_WIDTH = 1400;

    // process
    this.waitingHiddenThread = false;
    this.waitingHiddenThreadProcId = null;

};



GmailToTrello.PopupView.prototype.init = function() {
    log('GTT::view::initializing...');

    //check if already init
    if (this.detectPopup()) 
        return true;

    // inject a button & a popup

    var strAddCardButtonHtml = 
    `<div id="gttButton" class="T-I J-J5-Ji ar7 nf T-I-ax7 L3" data-tooltip="Add this email as a Trello card">
    <div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-J5-Ji Bq L3" tabindex="0">
        <img class="f tk3N6e-I-J3" src="` + chrome.extension.getURL('images/icon-13.jpg') + `">
        <span class="button-text">Add card</span>
    </div>
    </div>`;


    /* Sample data:              
     <div id="gttButton" class="T-I J-J5-Ji ar7 nf T-I-ax7 L3" data-tooltip="Add this card to Trello">
     <div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-Zh-I J-J5-Ji Bq L3" tabindex="0">
     <img class="f tk3N6e-I-J3" src="chrome-extension://dmphibjhlehaljceeocbdeoaedkknipg/images/icon-13.jpg">
     <span class="button-text">Add card</span>
     </div>
     </div>              
     */

    var strPopupHtml = `
    <div id="gttPopup" class="J-M jQjAxd open" style="display:none">
    <div id="gttPopupSlider"></div>
    <div class="inner">
  <div class="hdr clearfix">
    <div class="userinfo">
    </div>
    <span class="item">|</span>
    <a class="item" href="https://trello.com/b/CGU9BYgd/gmail-to-trello-development" target="_blank" title="Open Gmail-to-Trello Feature/Bug board in a new window">Features/Bugs</a>
    <a class="item" href="javascript:void(0)" id="close-button" title="Close">&times;</a>
    </div>
  <div class="popupMsg">Loading...</div>
        <div class="content menuInnerContainer" style="display:none">
            <dl>
                <dt style="display:none">Orgs. filter:</dt>
                <dd style="display:none">
                   <select id="gttOrg">
                      <option value="all">All</option>
                      <option value="-1">My Boards</option>
                   </select>
                </dd>
                <dt>Board:</dt>
                <dd><select id="gttBoard"></select></dd>
                <dt>List:</dt>
                <dd class="clearfix listrow">
                    <span id="gttListMsg">...please pick a board...</span>
                    <ul id="gttList"></ul>
                </dd>
                <dt>Labels:</dt>
                <dd class="clearfix listrow">
                    <span id="gttLabelsMsg">...please pick a board...</span>
                    <ul id="gttLabels"></ul>
                </dd>
                <dt>Title:</dt>
                <dd><input type="text" id="gttTitle" /></dd>
                <dt>Description:</dt>
                <dd><textarea id="gttDesc" style="height:180px;width:300px"></textarea></dd>
                <dd>
                    <input type="checkbox" checked="checked" id="chkBackLink"/>
                    <label for="chkBackLink">Link back to GMail</label>
                    <input type="checkbox" checked="checked" id="chkSelfAssign" style="margin-left:30px">
                    <label for="chkSelfAssign">Assign me to this card</label>
                </dd>
                <dd><input type="button" disabled="true" id="addTrelloCard" value="Add Trello card"></input></dd>
           </dl>
       </div>
   </div>
</div>`;
    
    this.$toolBar.append(strAddCardButtonHtml + strPopupHtml);
    this.$addCardButton = jQuery('#gttButton', this.$toolBar);
    this.$popup = jQuery('#gttPopup', this.$toolBar);
    this.$popup.draggable();
    
    this.$popupMessage = jQuery('.popupMsg', this.$popup);
    this.$popupContent = jQuery('.content', this.$popup);
    this.$popupChkGmail = jQuery('#chkBackLink', this.$popup);
    this.$popupChkSelfAssign = jQuery('#chkSelfAssign', this.$popup);

    
    // NOTE (Ace, 15-Jan-2017): Set the initial width by measuring from the left corner of the
    // "Add card" button to the edge of the window and then center that under the "Add card" button:
    var addCardLeft = this.$addCardButton.position().left;
    var addCardCenter = addCardLeft + (this.$addCardButton.outerWidth() / 2);
    
    var parent = jQuery(document.documentElement);
    var parentRight = parent.position().left + parent.outerWidth();

    // We'll make our popup twice as wide as the button to the end of the window up to MAX_WIDTH:
    var newPopupWidth = 2*(parentRight - addCardLeft);
    if (newPopupWidth < this.MIN_WIDTH) {
        newPopupWidth = this.MIN_WIDTH;
    } else if (newPopupWidth > this.MAX_WIDTH) {
        newPopupWidth = this.MAX_WIDTH;
    }
    this.$popup.css('width', newPopupWidth + 'px');

    var newPopupLeft = addCardCenter - (newPopupWidth / 2);

    this.$popup.css('left', newPopupLeft + 'px')

    this.onResize();

    this.bindEvents();

    this.isInitialized = true;
};

GmailToTrello.PopupView.prototype.detectPopup = function() {

    //detect duplicate toolBar
    var $button = $('#gttButton');
    var $popup = $('#gttPopup');
    if ($button.length>0) {
        log('GTT::Found Button at:');log($button);
        if ($button[0].clientWidth <= 0) {
            log('GTT::Button is in an inactive region. Moving...');
            //relocate
            $button.appendTo(this.$toolBar);
            $popup.appendTo(this.$toolBar);

        }
            // update when visible
        if ($popup[0].clientWidth > 0) {
            //log($popup[0]);
            //log($popup[0].clientWidth);
            this.event.fire('onRequestUpdateGmailData');
        }
        return true;
    }
    else
        return false;

    //return $('#gttPopup').length>0;
};

GmailToTrello.PopupView.prototype.loadSettings = function() {

};

// NOTE (Ace, 15-Jan-2017): This resizes all the text areas to match the width of the popup:
GmailToTrello.PopupView.prototype.onResize = function() {
    var textWidth = this.$popup.width() - 111;
    jQuery('input[type=text],textarea', this.$popup).css('width', textWidth + 'px');
};

GmailToTrello.PopupView.prototype.bindEvents = function() {
    // bind events
    var self = this;

    /** Popup's behavior **/

    //slider (blue bar on left side of dialog to resize)
    var $slider = jQuery("#gttPopupSlider", this.$popup);
    var constraintRight = jQuery(window).width() - this.MIN_WIDTH;

    $slider.draggable({axis: "x", containment: [0, 0, constraintRight, 0],
        stop: function(event, ui) {
            var distance = ui.position.left - ui.originalPosition.left;
            self.$popup.css('width', self.$popup.width()-distance+'px');
            $slider.css('left', '0');
            //self.$popup.css('left', (self.$popup.position().left + distance) + 'px');
            //$slider.css('left', ui.originalPosition.left + 'px');
            self.onResize();
        }
    });

    jQuery('#close-button', this.$popup).click(function() {
        self.$popup.toggle();
    });

    /** Add Card Panel's behavior **/

    this.$addCardButton.click(function() {
        self.$popup.toggle();
        if (self.$popup.css('display') === 'block')
            self.event.fire('onPopupVisible');
        else {
            self.stopWaitingHiddenThread();
        }
    });

    jQuery('#gttOrg', this.$popup).change(function() {
        //log(boardId);
        self.updateBoards();
    });

    var $board = jQuery('#gttBoard', this.$popup);
    $board.change(function() {
        var boardId = $board.val();

        if (boardId === '_') {
            $board.val("");
        }

        var $list = jQuery('#gttList', self.$popup);
        var $labels = jQuery('#gttLabels', self.$popup);
        var $listMsg = jQuery('#gttListMsg', self.$popup);
        var $labelsMsg = jQuery('#gttLabelsMsg', self.$popup);

        $list.html('').hide();
        $labels.html('').hide();
        if (boardId === "_" || boardId === "") {
            $listMsg.text('...please pick a board...').show();
            $labelsMsg.text('...please pick a board...').show();
        }
        else {
            $listMsg.text('Loading...').show();
            $labelsMsg.text('Loading...').show();
        }

        self.event.fire('onBoardChanged', {boardId: boardId});

        self.validateData();

    });

    jQuery('#addTrelloCard', this.$popup).click(function() {
        if (self.validateData()) {
            //jQuery('#addTrelloCard', this.$popup).attr('disabled', 'disabled');
            self.$popupContent.hide();
            self.showMessage('Submiting new card...');
            self.event.fire('onSubmit');
        }
    });


    //this.bindEventHiddenEmails();

};

GmailToTrello.PopupView.prototype.bindData = function(data) {
    var self = this;

    this.data = data;

    //log(data.gmail);

    this.$popupMessage.hide();
    this.$popupContent.show();

    //bind trello data
    var user = data.trello.user;
    var $userAvatar = '';
    if (user.avatarUrl) {
        $userAvatar = $('<img class="member-avatar">').attr('src', user.avatarUrl);
    }
    else {
        $userAvatar = $('<span class="member-avatar">').text(user.username.substr(0, 1).toUpperCase());
    }
    $('.userinfo', this.$popup).append($('<a class="item">').attr('href', user.url).attr('target', '_blank').attr('title', 'Open your Trello homepage').append($userAvatar));
    $('.userinfo', this.$popup).append($('<a class="item">').attr('href', user.url).attr('target', '_blank').attr('title', 'Open your Trello homepage').append(user.username));
    $('.userinfo', this.$popup).append($('<span class="item">|</span> <a class="item signOutButton" href="javascript:void(0)" title="Sign out">Sign out</a>'));

    jQuery('.signOutButton', this.$popup).click(function() {
        self.showMessage(`Unimplemented. Try the following:
			<ol><li>Under menu "Chrome":</li>
			<li>Select "Clear Browsing Data..."</li>
            <li>Check "Clear data from hosted apps"</li>
			<li>Press button "Clear browsing data"</li>
			</ol>
			<input type="button" class="hideMsg" value="Okay" title="Dismiss message"></input></dd>`
            );
        jQuery('.hideMsg').click(function() {
            self.hideMessage();
        });

    });


    var orgs = data.trello.orgs;
    var $org = $('#gttOrg', this.$popup);
    $org.append($('<option value="all">All</option>'));
    for (var i = 0; i < orgs.length; i++) {
        var item = orgs[i];
        $org.append($('<option>').attr('value', item.id).append(item.displayName));
    }
    $org.val('all');
/* NOTE (Ace, 15-Jan-2017): This sets Org to 'All' and lists all boards for all orgs. Uncomment if you want org selection:
    if (this.data.settings.orgId) {
        var settingId = this.data.settings.orgId;
        for (var i = 0; i < data.trello.orgs.length; i++) {
            var item = data.trello.orgs[i];
            if (item.id == settingId) {
                $org.val(settingId);
                break;
            }
        }
    }
*/
    this.updateBoards();

    if (data.settings.hasOwnProperty('useBacklink')) {
        jQuery('#chkBackLink', this.$popup).prop('checked', data.settings.useBacklink);
    }

    if (data.settings.hasOwnProperty('selfAssign')) {
        jQuery('#chkSelfAssign', this.$popup).prop('checked', data.settings.selfAssign);
    }

};

GmailToTrello.PopupView.prototype.bindGmailData = function(data) {
    //auto bind gmail data
    jQuery('#gttTitle', this.$popup).val(data.subject);
    //log(data.body);
    jQuery('#gttDesc', this.$popup).val(data.body);
    //jQuery('#gttDesc', this.$popup)[0].value = data.body;

    this.dataDirty = false;

};

GmailToTrello.PopupView.prototype.showMessage = function(text) {
    this.$popupMessage.html(text).show();
};

GmailToTrello.PopupView.prototype.hideMessage = function(text) {
    this.$popupMessage.hide();
};

GmailToTrello.PopupView.prototype.updateBoards = function() {

    var $org = jQuery('#gttOrg', this.$popup);
    var orgId = $org.val();

    var orgs = this.data.trello.orgs;
    var filteredOrgs = [];

    if (orgId === 'all')
        filteredOrgs = orgs;
    else {
        for (var i = 0; i < orgs.length; i++) {
            if (orgs[i].id == orgId)
                filteredOrgs.push(orgs[i]);
        }
    }

    var boards = this.data.trello.boards;

    var $board = jQuery('#gttBoard', this.$popup);
    $board.append($('<option value="">Select a board...</option>'));
    for (var i = 0; i < filteredOrgs.length; i++) {
        var orgItem = filteredOrgs[i];
        // This is unnessessary because a "please select" option is already existed above
        // if (i > 0 && filteredOrgs.length > 1)
        //     $board.append($('<option value="_">-----</option>'));
        for (var j = 0; j < boards.length; j++) {
            if (boards[j].idOrganization == orgItem.id) {
                var item = boards[j];
                $board.append($('<option>').attr('value', item.id).append(orgItem.displayName + ' &raquo; ' + item.name));
            }
        }
    }

    var settings = this.data.settings;
    if (settings.orgId && settings.orgId == orgId && settings.boardId) {
        var settingId = this.data.settings.boardId;
        for (var i = 0; i < boards.length; i++) {
            var item = boards[i];
            if (item.id == settingId) {
                $board.val(settingId);
                break;
            }
        }
    }

    $board.change();
};

GmailToTrello.PopupView.prototype.updateLists = function() {
    var self = this;
    var lists = this.data.trello.lists;
    var $gtt = $('#gttList', this.$popup);

    for (var i = 0; i < lists.length; i++) {
        var item = lists[i];
        $gtt.append($('<li>').attr('value', item.id).append(item.name));
    }
    $gtt.show();

    jQuery('#gttListMsg', this.$popup).hide();

    var listControl = new MenuControl('#gttList li');
    listControl.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var orgId = jQuery('#gttOrg', this.$popup).val();
    var boardId = jQuery('#gttBoard', this.$popup).val();
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.listId) {
        var settingId = settings.listId;
        for (var i = 0; i < lists.length; i++) {
            var item = lists[i];
            if (item.id == settingId) {
                jQuery('#gttList li[value="' + item.id + '"]').click();
                ;
                break;
            }
        }
    }
    else
        //select 1st list item
        jQuery('#gttList li:first').click();
};

GmailToTrello.PopupView.prototype.updateLabels = function() {
    var self = this;
    var labels = this.data.trello.labels;
    var $gtt = $('#gttLabels', this.$popup);

    for (var i = 0; i < labels.length; i++) {
        var item = labels[i];
        if (item.name.length > 0) {
            $gtt.append($('<li>').attr('value', item.id).attr('style', 'color:' + item.color).append(item.name));
        }
    }
    $gtt.show();

    jQuery('#gttLabelsMsg', this.$popup).hide();

    var labelsControl = new MenuControl('#gttLabels li');
    labelsControl.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var orgId = jQuery('#gttOrg', this.$popup).val();
    var boardId = jQuery('#gttBoard', this.$popup).val();
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.labelsId) {
        var settingId = settings.labelsId;
        for (var i = 0; i < labels.length; i++) {
            var item = labels[i];
            if (item.id == settingId) {
                jQuery('#gttLabels li[value="' + item.id + '"]').click();
                ;
                break;
            }
        }
    } else {
        // First list item for labels is "none", select that if nothing selected (eventually each one should toggle on/off):
        jQuery('#gttLabels li:first').click();
    }
};

GmailToTrello.PopupView.prototype.stopWaitingHiddenThread = function() {
    if (this.waitingHiddenThreadProcId !== null) {
        this.waitingHiddenThread = false;
        this.waitingHiddenThreadRetries = 0;
        clearInterval(this.waitingHiddenThreadProcId);
    }
};

GmailToTrello.PopupView.prototype.bindEventHiddenEmails = function() {
    var self = this;
    // update gmail thread on click
    jQuery('#gttTitle', this.$popup).change(function() {
        self.dataDirty = true;
    });
    jQuery('#gttDesc', this.$popup).change(function() {
        self.dataDirty = true;
    });

    log('debug hidden threads');
    this.$expandedEmails.parent().find('> .kx,> .kv,> .kQ,> .h7').click(function() {
        if (self.$popup.css('display') === 'none')
            return;

        log('Hidden email thread clicked');
        log(this.classList);
        if (self.dataDirty)
            return;

        if (this.classList.contains('kx') || this.classList.contains('kQ'))
            return;
        else
            self.parseData();

        self.waitingHiddenThreadRetries = 10;
        self.waitingHiddenThreadElement = this;

        if (!self.waitingHiddenThread) {
            //loading, give it a change 
            self.waitingHiddenThread = true;
            self.waitingHiddenThreadProcId = setInterval(function() {
                log('waitingHiddenThread. round ' + self.waitingHiddenThreadRetries);
                var elm = self.waitingHiddenThreadElement;
                if (elm.classList.contains('h7') || elm.classList.contains('kv')) {
                    self.stopWaitingHiddenThread();
                    self.parseData();
                }
                if (self.waitingHiddenThreadRetries > 0)
                    self.waitingHiddenThreadRetries--;
                else
                    self.stopWaitingHiddenThread();
            }, 1000);
        }
    });
    //jQuery(this.selectors.hiddenEmails).click(function() {
    //log(this.classList);
    //    if (!self.dataDirty)
    //        self.parseData();
    //});    
};

GmailToTrello.PopupView.prototype.validateData = function() {

    var newCard = {};
    var orgId = jQuery('#gttOrg', this.$popup).val();
    var boardId = jQuery('#gttBoard', this.$popup).val();
    var listId = jQuery('#gttList li.active', this.$popup).attr('value');
    var labelsId = jQuery('#gttLabels li.active', this.$popup).attr('value');
    var title = jQuery('#gttTitle', this.$popup).val();
    var description = jQuery('#gttDesc', this.$popup).val();
    var useBacklink = jQuery('#chkBackLink', this.$popup).is(':checked');
    var selfAssign = jQuery('#chkSelfAssign', this.$popup).is(':checked');
    var timeStamp = jQuery('.gH .gK .g3:first', this.$visibleMail).attr('title');

    var validateStatus = (boardId && listId && labelsId && title);
    log('validateData: ' + boardId + ' - ' + listId + ' - ' + labelsId + ' - ' + title);

    if (validateStatus) {
        newCard = {
            orgId: orgId,
            boardId: boardId,
            listId: listId,
            labelsId: labelsId,
            title: title,
            description: description,
            useBacklink: useBacklink,
            selfAssign: selfAssign,
            timeStamp: timeStamp
        };
        this.data.newCard = newCard;
    }
    jQuery('#addTrelloCard', this.$popup).attr('disabled', !validateStatus);

    return validateStatus;
};

GmailToTrello.PopupView.prototype.reset = function() {
    this.$popupMessage.hide();
    this.$popupContent.show();
};

GmailToTrello.PopupView.prototype.displaySubmitCompleteForm = function() {
    var data = this.data.newCard;
    log(this.data);

    // NB: this is a terrible hack. The existing showMessage displays HTML by directly substituting text strings.
    // This is very dangerous (very succeptible to XSS attacks) and generally bad practice.  It should be either 
    // switched to a templating system, or changed to use jQuery. For now, I've used this to fix
    // vulnerabilities without having to completely rewrite the substitution part of this code.
    // TODO(vijayp): clean this up in the future
    var jQueryToRawHtml = function(jQueryObject) {
        return jQueryObject.prop('outerHTML');
    }
    this.showMessage('Trello card created: ' + 
        jQueryToRawHtml($('<a>').attr('href', data.url).attr('target', '_blank').append(data.title)));
    this.$popupContent.hide();
};