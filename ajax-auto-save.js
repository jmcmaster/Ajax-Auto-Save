/*/
/* Autosave.js
/* Jason McMaster
/* v0.1
/* Dependencies: Underscore.js, jQuery, moment.js, Sticky-kit v1.1.2
/*/
var Autosave = function(){
    var form = null;
    var saveQueue = null;
    var isSaveQueued = false;
    var initialFormData = {};

    // Default Settings
    // Any of these can be passed in as args in the constructor
    var settings = {
        'formId': 'form-id-example'
        'saveType': 'ajax',
        'type': 'POST',
        'threshold': 1000,
        'delay': 2000,
        'url': 'Enter URL to ajax',
        'customListenerSelector': '.custom-selector-class',
        'multipart': false,
        'timestampClass': 'autosave-timestamp',
        'syncingIndicatorClass': 'sync-indicator',
    };

    var init = function(args){
        // Check arguments for quality
        for (var attrname in args) { settings[attrname] = args[attrname]; } // Build module settings object
        if (typeof settings.formId == "string") form = document.getElementById(settings.formId);
        if (form === null) return false;

        // Get and store the initial form data
        initialFormData = _getFormData();

        // Add listeners
        _listeners();

        // Set up front end elements
        _initFrontendElements();
    };

    var _listeners = function() {
        if ( window.addEventListener ) { // avoid errors in incapable browsers
            form.addEventListener('input', _.debounce( _formChangeHandler, settings.threshold ), true); // fires on all inputs regardless of focus state
            $(form).change( _.debounce( _formChangeHandler, settings.threshold ) ); // fires on all form elements on blur

            //Custom listener available per instance
            if (settings.customListenerSelector) {
                $(settings.customListenerSelector).on('click', _formChangeHandler);
            }
        }
    };

    var _formChangeHandler = function(e) {
        var formData = _getFormData();
        var dirtyForm = _compareFormData(formData);

        // If form data has been updated, process the save
        if (dirtyForm == true) {
            initialFormData = formData;

            // if save is queued up, clear the timeout, then restart the timeout
            if (isSaveQueued == true) {
                clearTimeout(saveQueue);
                console.log('Queue Timer Reset');
            } else {
                isSaveQueued = true;
                _showSyncingAnimation();
                console.log('Save Queued');
            }

            // Queue the save
            saveQueue = setTimeout(function () {
                isSaveQueued = false;
                _saveData();
            }, settings.delay);
        }
    };

    var _saveData = function() {
        var formData;
        var csrftoken = $.cookie('csrftoken');

        if (settings.multipart == true) {
            formData = new FormData($(form)[0]);
        } else {
            formData = $(form).serialize();
        }

        $.ajax({
            url: settings.url,
            type: settings.type,
            data: formData,
            contentType: settings.multipart ? false : 'application/x-www-form-urlencoded; charset=UTF-8',
            processData: settings.multipart ? false : true,
            beforeSend: function(xhr, settings) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                    console.log('Saving...');
            },
            success: function (response) {
                //console.log(response); // log the returned json to the console
                console.log("Save Success!"); // another sanity check

                // Update Front-end
                _updateTimestamp();
                _removeSyncingAnimation();

                if (response.id_resume) {
                    _displayFileActions('id_resume');
                }
                if (response.id_cover_letter) {
                    _displayFileActions('id_cover_letter');
                }
                if (response.id_transcripts) {
                    _displayFileActions('id_transcripts');
                }
            },
            error: function(xhr,errmsg,err) {
                console.log("Oops! We have encountered an error: "+errmsg);
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            }
        });
    };

    var _getFormData = function() {
        var formFieldData = {};
        // Get data from form
        $(':input', form).each(function() {
            formFieldData[$(this).attr("name")] = $(this).val();
        });
        return formFieldData;
    };

    var _compareFormData = function() {
        var isDirty = false;
        // Search for changes in the data
        $(':input', form).each(function() {
            if (initialFormData[$(this).attr("name")] != $(this).val()) {
                isDirty = true;

            }
        });

        if (isDirty == true) return true;
        return false;
    };

    var _initFrontendElements = function() {
        $('.wrapper').append('<div class="'+settings.syncingIndicatorClass+' hide"></div>');

        $(form).append('<span class="autosave-timestamp hide"></span>');
        $('.'+settings.syncingIndicatorClass).stick_in_parent();
    };

    var _showSyncingAnimation = function() {
        var $element = $('.'+settings.syncingIndicatorClass);
        $element.html('<i class="icon-sync"></i>');
    };

    var _removeSyncingAnimation = function() {
        var $element = $('.'+settings.syncingIndicatorClass);
        $element.find('i').remove();
    };

    var _displayFileActions = function(id) {
        var $elem = $('#' + id).closest('.field');

        if ($elem.find('.file-actions').length > 0 ) {
            return false;
        }

        var $actions = $('#file-actions-' + id).html();
        $elem = $('#' + id).closest('.field');
        $description = null;
        if ($elem.find('.description').length != 0) {
            $description = $elem.find('.description');
        }
        $elem.append($actions);
        if ($description != null) {
            $elem.append($description);
        }
    };

    var _updateTimestamp = function() {
        $timestamp = $(form).find('.'+settings.timestampClass);
        $timestamp.html('Last Updated: Today at '+ _getCurrentTimestamp());
        if ($timestamp.hasClass('hide')) { $timestamp.removeClass('hide'); }
    };

    var _getCurrentTimestamp = function() {
        return moment().format('h:mm a');
    };

    // Module API
    return {
        init:init,
    }
};
