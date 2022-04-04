let MAP;
let COUNTYINFO;
let BBOX; // save county bounding box
let TOGGLELAYER; // track whether we're toggling a layer on and off for switching county boundaries
let COUNTYOVERLAY; // 2020 county boundaries
let COUNTYOVERLAY2010; // 2010 county boundaries
const QUANTILEBREAKS = {}; // contains quantile breaks by layerid
const INDICATORS_BY_TRACT = {}; // contains indicator data by geoid
const SITESCOREBREAKS = {}; // contains quantile breaks by site score field (displayed in characteristics of suggested area popup)
const SITESCORES = {};  // contains site score data by site id
const RAWVALS = {}; // contains whether quantile breaks uses raw values by layerid


$(document).ready(function () {
    initCountyInfo();
    initAdditionalDataWording();
    initSidebarTogglers();
    initCountyMap();
    initLayerControls();
    initDownloadModal();
    initTooltips();
    initIndicatorData();
    initScoredSitesData();
});

function initCountyInfo () {
    // populate the global which we'll use often
    COUNTYINFO = getParticipatingCountyInfo((new URLSearchParams(window.location.search)).get('county'));

    // fill in the county name into the title bar
    $('#sidebar > h1').text(`${COUNTYINFO.name}`);

    // add alert for mobile
    $('#mobile');

    // if there is an Out Of Order message, fill in the explanation why the county is broken
    if (COUNTYINFO.outoforder) $('#outoforder').text(COUNTYINFO.outoforder);
    else $('#outoforder').remove();
}

function initAdditionalDataWording () {
    // hack to change the words Additional Data if there are no suggested / additional sites
    // because then it's not "additional" data
    const $addldatatitle = $('#additionaldata-title');

    const hasareas = COUNTYINFO.datalayers.suggestedareas.length || COUNTYINFO.datalayers.additionalareas.length;

    if (! hasareas) {
        $addldatatitle.text('Data');
    }
}

function initSidebarTogglers () {
    jQuery('#sidebar-and-map div.sidebar-closer').click(function (event) {
        event.stopPropagation();
        toggleSidebar(false);
    });

    jQuery('#sidebar-and-map div.sidebar-opener').click(function (event) {
        event.stopPropagation();
        toggleSidebar(true);
    }).click();
}

function initTooltips () {
    // Tooltipster will look for a param called  which is a jQuery/querySelector string, and use that HTML block as the tooltip content
    var $tipbuttons = $('i[data-tooltip-content], span[data-tooltip-content]');

    $tipbuttons.each(function () {
        if ($(this).attr('data-tooltip-content') == '#tooltips > div[data-tooltip=\"pois\"]') {
            $(this).tooltipster({
                trigger: 'hover',
                autoClose: false,
                hideOnClick: true,
                animation: 'fade',
                animationDuration: 150,
                distance: 0,
                maxWidth: 400,
                side: [ 'right', 'bottom' ],
                contentCloning: true,  // allow multiple i links with the same tooltip
                interactive: true, // don't auto-dismiss on mouse activity inside, let user copy text, follow links, ...
                functionBefore: function (instance, helper) { // close open ones before opening this one
                    jQuery.each(jQuery.tooltipster.instances(), function(i, instance) {
                        instance.close();
                    });
                },
            });
        } 
        else if ((COUNTYINFO.profile == 'quartermile') & (COUNTYINFO.countyfp != '013')) {
            $text = $($(this).attr('data-tooltip-content')).text().replace('County', 'City').replace('county', 'city');
            $(this).tooltipster({
                trigger: 'hover',
                autoClose: false,
                hideOnClick: true,
                animation: 'fade',
                animationDuration: 150,
                distance: 0,
                maxWidth: 300,
                side: [ 'right', 'bottom' ],
                content: $text,
                contentCloning: true,  // allow multiple i links with the same tooltip
                interactive: true, // don't auto-dismiss on mouse activity inside, let user copy text, follow links, ...
                functionBefore: function (instance, helper) { // close open ones before opening this one
                    jQuery.each(jQuery.tooltipster.instances(), function(i, instance) {
                        instance.close();
                    });
                },
            });
        }
        else {
            $(this).tooltipster({
                trigger: 'hover',
                autoClose: false,
                hideOnClick: true,
                animation: 'fade',
                animationDuration: 150,
                distance: 0,
                maxWidth: 300,
                side: [ 'right', 'bottom' ],
                contentCloning: true,  // allow multiple i links with the same tooltip
                interactive: true, // don't auto-dismiss on mouse activity inside, let user copy text, follow links, ...
                functionBefore: function (instance, helper) { // close open ones before opening this one
                    jQuery.each(jQuery.tooltipster.instances(), function(i, instance) {
                        instance.close();
                    });
                },
            });
        };
    });
}

function initDownloadModal () {
    // fill in the list of dowload offerings in the Desceriptions and Download modal
    const $listing = $('#modal-download-filedownloads');

    {
        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/indicator_files/indicator_data.zip" target="_blank">Demographic, Voter, and Population Data (SHP)</a>`);
        $('<li></li>').append($link).appendTo($listing);
    }
    {
        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/indicator_files/indicator_data.csv" target="_blank">Demographic, Voter, and Population Data (CSV)</a>`);
        $('<li></li>').append($link).appendTo($listing);
    }

    COUNTYINFO.datalayers.suggestedareas.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;

        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (SHP)</a>`);
        $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
    });

    COUNTYINFO.datalayers.additionalareas.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;

        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (SHP)</a>`);
        $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
    });

    COUNTYINFO.datalayers.allareas.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;

        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (SHP)</a>`);
        $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
    });

    COUNTYINFO.datalayers.voterdata.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;

        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (CSV)</a>`);
        $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
    });

    COUNTYINFO.datalayers.populationdata.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;

        const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (CSV)</a>`);
        $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
    });

    COUNTYINFO.datalayers.pointsofinterest.forEach(function (layerinfo) {
        if (! layerinfo.downloadfile) return;
        if (layerinfo.downloadfile.includes('zip')) {
            const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (SHP)</a>`);
            $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
        }
        else {
            const $link = $(`<a href="data/${COUNTYINFO.countyfp}/${layerinfo.downloadfile}" target="_blank">${layerinfo.title} (CSV)</a>`);
            $(`<li data-layer-id="${layerinfo.id}"></li>`).append($link).appendTo($listing);
        }
    });
    {
        const $link = $(`<a href="data/crosswalk.pdf" target="_blank">Metadata Dictionary (PDF)</a>`);
        $('<br>The names and definitions for each variable present in the .CSV and Shapefile data downloads are outlined below in the Metadata Dictionary PDF document<li></li>').append($link).appendTo($listing);
    }
}

function initLayerControls () {
    // lay out the checkboxes for the layers described in this county's data profile
    // see also findCheckboxForLayerId() which can look up one of these by the layer id
    const $sections = $('#sidebar div[data-section]');
    const $section_sugg = $sections.filter('[data-section="suggestedareas"]');
    const $section_addl = $sections.filter('[data-section="additionalareas"]');
    const $section_all = $sections.filter('[data-section="allareas"]');
    const $section_voter = $sections.filter('[data-section="voterdata"]');
    const $section_popn = $sections.filter('[data-section="populationdata"]');
    const $section_poi = $sections.filter('[data-section="pointsofinterest"]');

    COUNTYINFO.datalayers.suggestedareas.forEach(function (layerinfo) {
        const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
        $section_sugg.append($cb);
    });
    COUNTYINFO.datalayers.additionalareas.forEach(function (layerinfo) {
        const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
        $section_addl.append($cb);
    });
    COUNTYINFO.datalayers.allareas.forEach(function (layerinfo) {
        const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
        $section_all.append($cb);
    });
    COUNTYINFO.datalayers.voterdata.forEach(function (layerinfo) {
        const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
        $section_voter.append($cb);
    });
    COUNTYINFO.datalayers.populationdata.forEach(function (layerinfo) {
        if (layerinfo.id == 'prc_latino') {
            const $cb = $(`<button-small class="btn btn-link pl-0 py-0" type="button checkbox" data-toggle="collapse" data-parent="#accordion-populationdata" data-target="#accordion-latinodata" aria-controls="accordion-latinodata" aria-expanded="false"><div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="prc_latino" id="layercheckbox-prc_latino"> <label class="form-check-label" for="layercheckbox-prc_latino">Latino Percent of Population</label> <i class="fa fa-chevron-right"></i></div></button-small> <div class="collapse pl-3 pb-1" data-section="latinodata" id="accordion-latinodata"> </div>`);
            $section_popn.append($cb);

            const $sections_updated = $('#sidebar div[data-section]');
            const $section_latino = $sections_updated.filter('[data-section="latinodata"]');

            COUNTYINFO.datalayers.latino.forEach(function (layerinfo) {
                const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
                $section_latino.append($cb);
            });
        }
        else if (layerinfo.id == 'prc_asian') {
            const $cb = $(`<button-small class="btn btn-link pl-0 py-0" type="button checkbox" data-toggle="collapse" data-parent="#accordion-populationdata" data-target="#accordion-asiandata" aria-controls="accordion-asiandata" aria-expanded="false"><div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="prc_asian" id="layercheckbox-prc_asian"> <label class="form-check-label" for="layercheckbox-prc_asian">Asian Percent of Population</label> <i class="fa fa-chevron-right"></i></div></button-small> <div class="collapse pl-3 pb-1" data-section="asiandata" id="accordion-asiandata"> </div>`);
            $section_popn.append($cb);

            const $sections_updated = $('#sidebar div[data-section]');
            const $section_asian = $sections_updated.filter('[data-section="asiandata"]');

            COUNTYINFO.datalayers.asian.forEach(function (layerinfo) {
                const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
                $section_asian.append($cb);
            });
        }
        else {
            const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}">${layerinfo.title}</label></div>`);
            $section_popn.append($cb);
        }
    });
    COUNTYINFO.datalayers.pointsofinterest.forEach(function (layerinfo) {
        if (layerinfo.id == 'precincts') {
            const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"> <label class="form-check-label" for="layercheckbox-${layerinfo.id}"><line><span>${layerinfo.title}</span></line></label></div>`);
            $section_poi.append($cb);
        }
        else {
            const $cb = $(`<div class="form-check"><input class="form-check-input" type="checkbox" name="layers" value="${layerinfo.id}" id="layercheckbox-${layerinfo.id}"><label class="form-check-label" style="align-self: flex-start;" for="layercheckbox-${layerinfo.id}"><i class="fa fa-circle" aria-hidden="true" style="color: ${layerinfo.circle.fillColor};  align-items: flex-start;"></i>&nbsp;${layerinfo.title}</label></div>`);
            $section_poi.append($cb);
            

            // only include button if file exists or has data
            var pathToFile = `data/${COUNTYINFO.countyfp}/` + layerinfo.csvfile;
            Papa.parse(pathToFile, {
                download: true,
                header: true,
                skipEmptyLines: 'greedy',
                complete: function (results) {
                    const numrows = parseInt(results.data.length);
                    if (numrows == 0) {
                        const $dllink = $(`#modal-download-filedownloads li[data-layer-id="${layerinfo.id}"]`);
                        $dllink.remove();
                        $cb.remove();
                    };
                },
                error: function (e) {
                    const $dllink = $(`#modal-download-filedownloads li[data-layer-id="${layerinfo.id}"]`);
                    $dllink.remove();
                    $cb.remove();
                }
            });
        }
    });

    // check-change behavior on those checkboxes, to toggle layers
    const $checkboxes = $('#sidebar div[data-section] input[type="checkbox"][name="layers"]');
    $checkboxes.change(function () {
        const layerid = $(this).prop('value');
        const checked = $(this).is(':checked');
        toggleMapLayer(layerid, checked);
        refreshMapLegend();
    });

    // afterthought: any of those layer sets with 0 layers, we should delete their placeholder UI e.g. a title bar with nothing under it
    if (! COUNTYINFO.datalayers.suggestedareas.length) {
        $section_sugg.parents('div').first().remove();
    }
    if (! COUNTYINFO.datalayers.additionalareas.length) {
        $section_addl.parents('div').first().remove();
    }
    if (! COUNTYINFO.datalayers.allareas.length) {
        $section_all.parents('div').first().remove();
    }
    if (! COUNTYINFO.datalayers.voterdata.length) {
        $section_voter.prev('button').remove();
        $section_voter.remove();
    }
    if (! COUNTYINFO.datalayers.populationdata.length) {
        $section_popn.prev('button').remove();
        $section_popn.remove();
    }
    if (! COUNTYINFO.datalayers.pointsofinterest.length) {
        $section_poi.prev('button').remove();
        $section_poi.remove();
    }

    // the toggle sections of the Additional Data accordion, need their chvrons to change when they expand/collapse
    $('#sidebar div.collapse')
    .on('hide.bs.collapse', function () {
        const myid = $(this).prop('id');
        if ((myid == 'accordion-latinodata') || (myid == 'accordion-asiandata')) {
            var $button = $(`#sidebar button-small[data-target="#${myid}"]`);
        }
        else {
            var $button = $(`#sidebar button[data-target="#${myid}"]`);
        }
        const $chevron = $button.find('i');
        $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
    })
    .on('show.bs.collapse', function () {
        const myid = $(this).prop('id');
        if ((myid == 'accordion-latinodata') || (myid == 'accordion-asiandata')) {
            var $button = $(`#sidebar button-small[data-target="#${myid}"]`);
        }
        else {
            var $button = $(`#sidebar button[data-target="#${myid}"]`);
        }
        const $chevron = $button.find('i');
        $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
    });

    // a CSV file has a list of how many points are in each of the point files
    // load that, and add readouts to each layer showing this
    const sacfileurl = `data/${COUNTYINFO.countyfp}/model_files/site_area_count.csv`;
    Papa.parse(sacfileurl, {
        download: true,
        header: true,
        skipEmptyLines: 'greedy',
        complete: function (results) {
            results.data.forEach(function (line) {
                // the layer ID corresponds to a checkbox, a label, and so on
                // although in an edge case the layer may be disabled, and no checkbox; so we have to be circumspect about assuming that
                const layerid = line.file;
                let $checkbox;
                try { $checkbox = findCheckboxForLayerId(layerid); } catch (err) {}
                if (! $checkbox) return;

                const howmany = parseInt(line.count);
                const $label = $checkbox.siblings('label');
                const $cbdiv = $checkbox.closest('div.form-check');
                const $dllink = $(`#modal-download-filedownloads li[data-layer-id="${layerid}"]`);

                // if it's 0 then delete BOTH the checkbox's row and its download link; a lot of cross-dependencies here, see also initDownloadModal()
                if (howmany) {
                    $(`<span class="ml-2">(${howmany})</span>`).appendTo($label);
                }
                else {
                    $cbdiv.remove();
                    $dllink.remove();
                }
            });
        },
        error: function (err) {
            // the site_area_count.csv is mostly used for the suggested areas, and some data profiles won't have that
            // and setting up these (X) count readouts is not vital to functioning,
            // so it's okay if the file is not found, and we won't throw a fit
            busySpinner(false);
            //console.error(err);
            // alert(`Problem loading or parsing ${sacfileurl}`);
        },
    });

    // the Clear All button simply unchecks everything
    // also, be extra snazzy and show/hide when have any layers/no layers to clear
    const $clearbuttondiv = $('#clearselections');
    const $clearbutton = $clearbuttondiv.find('a');
    $clearbutton.click(function () {
        clearAllSelections();
    });
    $checkboxes.change(function () {
        const selectedlayerids = getEnabledLayerIds();
        if (selectedlayerids.length) $clearbuttondiv.removeClass('d-none');
        else $clearbuttondiv.addClass('d-none');
    });
}

function initCountyMap () {
    // the map, a fixed basemap, a labels overlay, and our special map controls
    // note the ZoomBar which we add after we have GeoJSON data and therefore a home extent
    MAP = L.map('countymap', {
        zoomControl: false,
        maxZoom: 18,
        minZoom: 6,
        zoomSnap: 0.25
    });

    L.control.scale({
        position: 'bottomleft',
        updateWhenIdle: true
    })
    .addTo(MAP);

    MAP.BASEMAPBAR = new L.Control.BasemapBar({
        position: 'topright',
        layers: BASEMAP_OPTIONS,
    })
    .addTo(MAP)
    .selectLayer(BASEMAP_OPTIONS[0].label);

    // two controls at the bottom to open some modals
    L.easyButton('Data Descriptions and Download <i class="fa fa-download"></i>', function () {
        $('#modal-download').modal('show');
    }, { position: 'bottomright' }).addTo(MAP);
    L.easyButton('Using This Tool <i class="fa fa-info-circle"></i>', function () {
        $('#modal-usingthistool').modal('show');
    }, { position: 'bottomright' }).addTo(MAP);

    // the legend control; see refreshMapLegend() which recalculates from all visible layers, and submits to this control
    // and the suggested area details special control
    // and a click behavior to dismiss the SuggestedAreaDetails control
    MAP.LEGENDCONTROL = new L.Control.CountyMapLegend();
    MAP.SUGGESTEDAREACONTROL = new L.Control.SuggestedAreaDetails();
    MAP.SUGGESTEDAREAHIGHLIGHT = L.featureGroup([]).addTo(MAP);
    MAP.on('click', function () {
        showSuggestedSiteInfo(null);
    });

    // load the statewide counties GeoJSON and filter to this one
    gjurl = `data/counties.json`;
    $.get(gjurl, function (data) {
        COUNTYOVERLAY = L.geoJson(data, {
            filter: function (feature) {
                return feature.properties.countyfp == COUNTYINFO.countyfp;
            },
            style: SINGLECOUNTY_STYLE,
            pane: 'low',
        })
        .addTo(MAP);

        BBOX = COUNTYOVERLAY.getBounds();
        MAP.fitBounds(BBOX);
        
        // now that we have a home bounds, add the zoom+home control then the geocoder control under it (they are positioned in sequence)
        MAP.ZOOMBAR = new L.Control.ZoomBar({
            position: 'topright',
            homeBounds: BBOX,
        }).addTo(MAP);

        MAP.GEOCODER = L.Control.geocoder({
            position: 'topright',
            showUniqueResult: false,
            defaultMarkGeocode: false,
            placeholder: 'Search for address or place',
            collapsed: true,  // control is buggy if expanded, won't close results list
        })
        .on('markgeocode', function (event) {
            MAP.fitBounds(event.geocode.bbox);
        })
        .addTo(MAP);
    }, 'json')
    .fail(function (err) {
        busySpinner(false);
        console.error(err);
        // alert(`Problem loading or parsing ${gjurl}`);
    });

    // load the statewide counties 2010 GeoJSON and filter to this one
    busySpinner(true);
    const gjurl2010 = `data/counties_2010.json`;
    $.get(gjurl2010, function (data) {
        COUNTYOVERLAY2010 = L.geoJson(data, {
            filter: function (feature) {
                return feature.properties.countyfp == COUNTYINFO.countyfp;
            },
            style: SINGLECOUNTY_STYLE,
            pane: 'low',
        })
        busySpinner(false);
    }, 'json')
    .fail(function (err) {
        busySpinner(false);
        console.error(err);
        // alert(`Problem loading or parsing ${gjurl}`);
    });     

    // a registry of layers currently in the map: layer ID => L.tileLayer or L.geoJson or L.featureGroup or whatever
    // and some panes for prioritizing them by mapzindex
    // managed by toggleMapLayer()
    MAP.OVERLAYS = {};

    MAP.createPane('lowest'); MAP.getPane('lowest').style.zIndex = 350;
    MAP.createPane('low'); MAP.getPane('low').style.zIndex = 400;
    MAP.createPane('medium'); MAP.getPane('medium').style.zIndex = 410;
    MAP.createPane('high'); MAP.getPane('high').style.zIndex = 420;
    MAP.createPane('highest'); MAP.getPane('highest').style.zIndex = 430;
    MAP.createPane('highlights'); MAP.getPane('highlights').style.zIndex = 490;
}

function initIndicatorData () {
    const fileurl = `data/${COUNTYINFO.countyfp}/indicator_files/indicator_data.csv`;
    busySpinner(true);
    Papa.parse(fileurl, {
        download: true,
        header: true,
        skipEmptyLines: 'greedy',
        complete: function (results) {
            // cache indicator data as INDICATORS_BY_TRACT
            results.data.forEach(function (row) {
                const geoid = parseInt(row.geoid);  // indicator_data.csv omits leading 0, work around by treating geoids as integers (smh)
                INDICATORS_BY_TRACT[geoid] = row;
            });
            // done
            busySpinner(false);
        },
        error: function (err) {
            busySpinner(false);
            console.error(err);
            // alert(`Problem loading or parsing ${fileurl}`);
        }
    });
}

function initScoredSitesData () {
    // read in all sites data and create quantile breaks for each field
    const fileurl = `data/${COUNTYINFO.countyfp}/model_files/all_sites_scored.csv`;
    busySpinner(true);
    Papa.parse(fileurl, {
        download: true,
        header: true,
        skipEmptyLines: 'greedy',
        complete: function (results) {
            // get breaks for layer quantfield
            Object.keys(COUNTYINFO.datalayers).forEach(function (groupname) {
                if (groupname == 'suggestedareas' || groupname == 'additionalareas' || groupname == 'allareas') {
                    COUNTYINFO.datalayers[groupname].forEach(function (layerinfo) {
                        const values = results.data.map(function (row) { return row[layerinfo.quantilefield]; });
                        QUANTILEBREAKS[layerinfo.id] = getBreaks(undefined, values)[0];
                        RAWVALS[layerinfo.id] = getBreaks(undefined, values)[1];
                    });
                }
            });   
            // for individual site scoring, log a lookup of site ID number => site scores, and a lookup of the quantile breaks for these scoring fields
            // these will be used in showSuggestedSiteInfo() to display details for a single site
           
            /*
            dens.cvap.std: County Percentage of Voting Age Citizens
            dens.work.std: County Worker Percentage
            popDens.std: Population Density
            prc.CarAccess.std: Percent of Population with Vehicle Access
            prc.ElNonReg.std : Eligible Non-Registered Voter Rate
            prc.disabled.std: Percent Disabled Population
            prc.latino.std: Percent Latino Population
            prc.nonEngProf.std:Percent Limited English Proficient Population
            prc.pov.std: Percent of the Population in Poverty
            prc.youth.std: Percent of the Youth Population
            rate.vbm.std: Vote by Mail Rate (Total)
            dens.poll.std: Polling Place Voter Percentage
            */
            results.data.forEach(function (row) {
                const siteid = row.idnum;
                SITESCORES[siteid] = {};
                SITE_SCORING_FIELDS.forEach(function (fieldname) {
                    const raw = row[fieldname];
                    const value = parseFloat(raw);
                    if (raw && isNaN(value)) console.error(`all_sites_scored.csv found non-numeric value ${raw} in field ${fieldname}`);
                    SITESCORES[siteid][fieldname] = value;
                });
            });

            SITE_SCORING_FIELDS.forEach(function (fieldname) {
                const values = results.data.map(function (row) { return row[fieldname]; });
                SITESCOREBREAKS[fieldname] = getBreaks(undefined, values)[0];
            });

            // done
            busySpinner(false);
        },
    });
}

function toggleSidebar (desired) {
    const $sidebar = jQuery('#sidebar');
    const $themap = jQuery('#countymap');
    const $opener = jQuery('#sidebar-and-map div.sidebar-opener');
    const $closer = jQuery('#sidebar-and-map div.sidebar-closer');
    const show = desired !== undefined ? desired : ! $sidebar.is(':visible');

    if (show) {
        $sidebar.removeClass('d-none');
        $closer.removeClass('d-none');
        $opener.addClass('d-none');
        $themap.addClass('map-with-sidebar');
    }
    else {
        $sidebar.addClass('d-none');
        $closer.addClass('d-none');
        $opener.removeClass('d-none');
        $themap.removeClass('map-with-sidebar');
    }

    if (MAP) {
        MAP.invalidateSize();
        MAP.fitBounds(BBOX);      
    }
}

function toggleMapLayer (layerid, visible) {
    // turn off a map layer is easy!
    const layerinfo = getLayerInfoByid(layerid);
    if (! layerinfo) throw new Error(`getLayerInfoByid() no layer named ${layerid}`);

    // turn off a map layer is easy!
    if (! visible) {
        if (MAP.OVERLAYS[layerid]) {
            MAP.removeLayer(MAP.OVERLAYS[layerid]);
            delete MAP.OVERLAYS[layerid];
        };

        // if we're turning off a layer after toggling and it's not a 2016 layer
        // then remove the 2010 counties and add the 2020 counties
        if (typeof TOGGLELAYER !== "undefined") {
            if (! TOGGLELAYER.includes('2016') && MAP.hasLayer(COUNTYOVERLAY2010)) {
                MAP.removeLayer(COUNTYOVERLAY2010);
                COUNTYOVERLAY.addTo(MAP);
            };
        // if we're turing off a 2016 layer and not toggling then also remove 2010 counties
        // but only if we're turning off indicator data
        } else {
            if (layerid.includes('2016') && layerinfo.layertype == 'indicators') {
                MAP.removeLayer(COUNTYOVERLAY2010);
                COUNTYOVERLAY.addTo(MAP);
            };
        };

        // reset toggle layer since we've ended sequence
        TOGGLELAYER = undefined;

        // well, slightly less easy because turning off vote center layers should also stop showing highlights
        // potential bug-like behavior would be turning on multiple suggested areas, highlighting one in one layer, and finding it un-highlghted when turning off the other layer
        // but that's really an edge case, and would be quite difficult to work around
        const issuggestedarea = layerinfo.quantilefield == 'center_score' || layerinfo.quantilefield == 'droppoff_score';
        if (issuggestedarea) showSuggestedSiteInfo(null);

        return;

    // if we're turning on a layer, and it is part of a radiogroup, then turn off all others layers in that same radiogroup
    } else if (visible && layerinfo.radiogroup) {
        Object.keys(COUNTYINFO.datalayers).forEach(function (groupname) {
            COUNTYINFO.datalayers[groupname].forEach(function (thislayerinfo) {
                if (thislayerinfo.radiogroup != layerinfo.radiogroup) return;  // not in the same group
                if (! MAP.OVERLAYS[thislayerinfo.id]) return;  // not currently on the map
                if (thislayerinfo.id == layerinfo.id) return;  // it's this-here layer we're turning on

                const $uncheckme = findCheckboxForLayerId(thislayerinfo.id);
                // keep track of which layer we're toggling on
                TOGGLELAYER = layerinfo.id;
                setTimeout(function () {  // use a timeout so that a failure won't block continued execution of turning on our layer
                    $uncheckme.prop('checked', false).change();
                }, 1);
            });
        });
    };

    // hand off to whichever type of layer this is:
    // site scoring indicator. tract demographics indicator, point file for GeoJSON circles, custom GeoJSON file, ...
    if (layerinfo.customgeojsonfile) {
        addCustomGeoJsonFileToMap(layerinfo);
    }
    else if (layerinfo.csvfile) {
        addCsvPointFileToMap(layerinfo);
    }
    else if (layerinfo.layertype == 'indicators') {
        // if 2016 layer then add 2010 county boundaries
        if (layerid.includes('2016')) {
            MAP.removeLayer(COUNTYOVERLAY);
            COUNTYOVERLAY2010.addTo(MAP);
        };
        addIndicatorChoroplethToMap(layerinfo);
    }
    else {
        throw new Error(`toggleMapLayer() not sure what to do with ${layerid}`);
    }
}

function getEnabledLayerIds () {
    const $checkboxes = $('#sidebar div[data-section] input[type="checkbox"][name="layers"]');
    const $checked = $checkboxes.filter(':checked');
    const ids = $checked.map(function () { return $(this).prop('value'); }).get();
    return ids;
}

function clearAllSelections () {
    const $checkboxes = $('#sidebar div[data-section] input[type="checkbox"][name="layers"]');
    $checkboxes.prop('checked', false).change();  // these have change handlers
}

function refreshMapLegend () {
    // compose a list of HTML legends (jQuery items) for visible siting tool layers
    // do this in a few apsses to accommodate multiple types of legend: demographic detailed with break values, simple low-to-high, plain icons with layer title, ...
    const enabledlayerids = getEnabledLayerIds();
    const $collectedlegends = $('<div class="legend"></div>');

    // if there are no layers or only pois, then we can simply hide the legend control and be done with it
    // it only needs all the update code below if we're showing and updating
    const enabledlayertypes =  new Set();
    enabledlayerids.forEach(function (layerid) {
        const layerinfo = getLayerInfoByid(layerid);
        enabledlayertypes.add(layerinfo.layertype);
    });
    if (! enabledlayerids.length || enabledlayertypes.has('pois') && enabledlayertypes.size == 1) return MAP.removeControl(MAP.LEGENDCONTROL);

    // low-to-high circle swatches, used for site scoring
    enabledlayerids.forEach(function (layerid) {
        const layerinfo = getLayerInfoByid(layerid);
        if (layerinfo.legendformat != 'lowtohigh') return;  // uses the simpler low-to-high legend, not a detailed one like for demographics
        if (! layerinfo.quantilecolors) return;  // no colors defined, that's not right
        
        const $legend = $(`<div class="legend-layer" data-layer-id="${layerinfo.id}"></div>`);
        $(`<h4>${layerinfo.title}</h4>`).appendTo($legend);

        const $entry = $('<div class="legend-entry"></div>').appendTo($legend);
        $('<span>Low</span>').appendTo($entry);
        $('<span>&nbsp;</span>').appendTo($entry);
        layerinfo.quantilecolors.forEach(function (color) {
            const bordercolor = layerinfo.circle.color;
            $(`<div class="legend-swatch legend-swatch-square" style="background-color: ${color}; border-color: ${bordercolor}"></div>`).appendTo($entry);
            $('<span>&nbsp;</span>').appendTo($entry);
        });
        $('<span>High</span>').appendTo($entry);

        $('<br />').appendTo($entry);
        $('<span><a target="_blank" href="./methodology.html">Methodology</a> | <a target="_blank" href="./methodology.html#scoring-model">Site Scores <i class="fa fa-external-link"></i></a></span>').appendTo($entry);

        // done, add to the list
        $collectedlegends.append($legend);
    });

    // indicator layers
    enabledlayerids.forEach(function (layerid) {
        const layerinfo = getLayerInfoByid(layerid);
        if (! layerinfo.legendformat) return;  // no legend format given, skip it
        if (! layerinfo.quantilefield) return;  // not a quantiled color ramp legend, so skip it
        if (layerinfo.legendformat == 'lowtohigh') return;  // uses the simpler low-to-high legend, not a detailed one like for demographics
        
        const title = layerinfo.title; 
        const colors = layerinfo.quantilecolors;
        const values = new Array();
        Object.keys(INDICATORS_BY_TRACT).forEach(function (geoid) {
            values.push(INDICATORS_BY_TRACT[geoid][layerinfo.scorefield]);
        });
        QUANTILEBREAKS[layerinfo.id] = getBreaks(layerinfo, values)[0];
        RAWVALS[layerinfo.id] = getBreaks(layerinfo, values)[1];
        let breaks = QUANTILEBREAKS[layerinfo.id];
        
        let text = []; 
        // if county has 5 or fewer tracts or all the same values then show raw values (no under or higher language in legend)
        // also check for nans
        let formattedvalues = new Array();
        let nodata = false;
        values.forEach(function (value) { 
            const formattedvalue = (formatValue(value, layerinfo.legendformat));
            formattedvalues.push(formattedvalue)
            if (isNaN(formattedvalue)) { nodata = true};
        });
        if (formattedvalues.unique().length < 6) {
            for (let i=0, l=breaks.length; i<l; i++) {
                const valuetext = formatValueText(breaks[i], layerinfo.legendformat);
                text[i] = valuetext;
            };
        }
        else {
            for (let i=0, l=breaks.length-1; i<l; i++) {
                const firstvaluetext = formatValueText(breaks[i], layerinfo.legendformat);
                const nextvaluetext = formatValueText(breaks[i+1], layerinfo.legendformat);
                text[i] = firstvaluetext + " - " + nextvaluetext;
            };
        }

        const $legend = $(`<div class="legend-layer" data-layer-id="${layerinfo.id}"></div>`);
        $(`<h4>${title}</h4>`).appendTo($legend);

        for (let i = 0; i < text.length; i++) {
            if ((text[i] == "0.0%") || (text[i] == "0")) { 
                $(`<div class="legend-entry"><div class="legend-swatch" style="background-color: ${colors[i]};"></div> ${text[i]} <i class="fa fa-info-circle" data-tooltip-content='#tooltips > div[data-tooltip="legend"]'></i></div>`).appendTo($legend);
            }
            else {
                $(`<div class="legend-entry"><div class="legend-swatch" style="background-color: ${colors[i]};"></div> ${text[i]}</div>`).appendTo($legend);
            }
        };
        
        // add the legend entry for no data only if nans
        if (nodata) {
            $(`<div class="legend-entry"><div class="legend-swatch" style="background-color: ${NODATA_COLOR};"></div> No Data</div>`).appendTo($legend);
        };

        // add the legend entry for unreliable squares
        $(`<div class="legend-entry"><div class="legend-swatch legend-swatch-nodata"></div> Data source estimates with high uncertainty</div>`).appendTo($legend);

        // do we have a caveat footnote?
        if (COUNTYINFO.datafootnote) {
            $(`<div class="legend-entry">${COUNTYINFO.datafootnote}</div>`).appendTo($legend);
        }

        // done, add to the list
        $collectedlegends.append($legend);
    });

    // send them to the legend control for a refresh
    MAP.addControl(MAP.LEGENDCONTROL);
    MAP.LEGENDCONTROL.updateLegends($collectedlegends);
    // initialize tooltip for legend
    initTooltips(); 
}

function addIndicatorChoroplethToMap (layerinfo) {
    // fetch the tracts GeoJSON file and look up scores from the cached indicator data
    // add the vector features to the map, styled by their score
    // don't worry about "downloading" these files with every request; in reality they'll be cached
    const tractsurl = `data/${COUNTYINFO.countyfp}/${layerinfo.tracts}`;
    busySpinner(true);

    $.getJSON(tractsurl, function (gjdata) {
        busySpinner(false);

        const featuregroup = L.geoJson(gjdata, {
            style: function (feature) {
                const style = Object.assign({}, CENSUSTRACT_STYLE);
                const geoid = parseInt(feature.properties.geoid);  // indicator_data.csv omits leading 0, work around by treating geoids as integers (smh)
                const indicators = INDICATORS_BY_TRACT[geoid];
                if (! indicators) { console.debug(`No INDICATORS_BY_TRACT entry for ${geoid}`); return style; }
                const value = parseFloat(indicators[layerinfo.scorefield]);
                const colors = layerinfo.quantilecolors;      
                const thiscolor = pickColorByValue(value, QUANTILEBREAKS[layerinfo.id], RAWVALS[layerinfo.id], colors, layerinfo.legendformat);

                // fill is either the solid color, or else a StripePattern if the data are unreliable
                // note that L.StripePattern must be added to the Map, but we don't have a way of tracking which ones are in use so they will pile up over time and be a potential memory leak
                // that's probably not realistic unless one toggles thousnads of times between reloading
                const unreliable = parseInt(indicators[`${layerinfo.scorefield}_unreliable_flag`]) == 1;
                if (unreliable) {
                    const stripes = new L.StripePattern({
                        angle: -45,
                        weight: 7, spaceWeight: 1,  // default width is 8, this defines a 7:1 ratio
                        color: thiscolor, opacity: 1,  // fill is the selected color
                        spaceColor: 'black', spaceOpacity: 0.25,  // stripes, half-black
                    }).addTo(MAP);
                    style.fillPattern = stripes;
                }
                else {
                    style.fillColor = thiscolor;
                }

                return style;
            },
            pane: 'lowest',
        });

        // add to the map and to the registry
        MAP.OVERLAYS[layerinfo.id] = featuregroup;
        featuregroup.addTo(MAP);
        
    })
    .fail(function (err) {
        busySpinner(false);
        console.error(err);
        // alert(`Problem loading or parsing ${tractsurl}`);
    });
}

function addCsvPointFileToMap (layerinfo) {
    const fileurl = `data/${COUNTYINFO.countyfp}/${layerinfo.csvfile}`;
    busySpinner(true);
    Papa.parse(fileurl, {
        download: true,
        header: true,
        skipEmptyLines: 'greedy',
      	complete: function (results) {
            busySpinner(false);
            // data fix: standardize lat & lon to numbers
            results.data.forEach(function (row) {
                row.lat = parseFloat(row.lat);
                row.lon = parseFloat(row.lon);
            });

            // populate a new FeatureGroup with these circles, markers, whatever
            const featuregroup = L.featureGroup([]);
            results.data.forEach(function (row) {
                const issuggestedarea = layerinfo.quantilefield == 'center_score' || layerinfo.quantilefield == 'droppoff_score';
                if (issuggestedarea) {
                    const square = suggestedAreaSymbolizer(layerinfo, row);
                    square.addTo(featuregroup);
                }
                else if (layerinfo.circle) {
                    const circle = circleSymbolizer(layerinfo, row);
                    circle.addTo(featuregroup);
                }
            });

            // add to the map and to the registry
            MAP.OVERLAYS[layerinfo.id] = featuregroup;
            featuregroup.addTo(MAP);
        },
        error: function (err) {
            busySpinner(false);
            // data may not be available for all counties so ignore
            // console.error(err);
            // alert(`Problem loading or parsing ${fileurl}`);
        },
    });
}

function addCustomGeoJsonFileToMap (layerinfo) {
    // fetch the custom GeoJSON file and add it to the map, using the given style
    busySpinner(true);
    
    $.getJSON(`data/${COUNTYINFO.countyfp}/${layerinfo.customgeojsonfile}`, function (gjdata) {
        busySpinner(false);
        const featuregroup = L.geoJson(gjdata, {
            style: function (feature) {
                return layerinfo.style;  // just use the supplied layerinfo.style... for now
            },
            pane: 'low',
            onEachFeature: function (feature, layer) { 
                if (layerinfo.id == 'precincts') { 
                    layer.on('click', function (e){
                        // fill the polygon on the map
                        featuregroup.resetStyle();
                        const highlightoptions = { fill: '#969696', fillOpacity: 0.2, opacity: 5, color: 'black', weight: 1, interactive: true };
                        layer.setStyle(highlightoptions);
                        MAP.on('click', function() {featuregroup.resetStyle();});
                    });
                    if ('PRECINCT_NAME' in feature.properties) {
                        layer.bindPopup(`<b>Precinct Name</b>: ${feature.properties['PRECINCT_NAME']}<br><b>Precinct Number</b>: ${feature.properties['PRECINCT_NUM']}`);
                    }
                    else {
                        layer.bindPopup(`<b>Precinct Number</b>: ${feature.properties['PRECINCT_NUM']}`);
                    }
                    
                    layer.on('popupclose', function (e) {
                        featuregroup.resetStyle();
                    });   
                }
                else {
                    if (layerinfo.popupnamefield) {
                        layer.bindPopup(`<b>${layerinfo.popuptypetext}</b>: ${feature.properties[layerinfo.popupnamefield]}`);
                    };
                }; 
            },
        });
 
        // add to the map and to the registry
        MAP.OVERLAYS[layerinfo.id] = featuregroup;
        featuregroup.addTo(MAP);
    });
}

function suggestedAreaSymbolizer (layerinfo, row) {
    // Leaflet hack: a circle bounds can only be computer if the circle is on the map, so we do need to add it for a split-second
    const circle = L.circle([row.lat, row.lon], {radius: layerinfo.circle.radius}).addTo(MAP);

    const squareoptions = Object.assign({}, layerinfo.circle);
    squareoptions.bubblingMouseEvents = false;
    squareoptions.pane = layerinfo.mapzindex ? layerinfo.mapzindex : 'medium';

    if (squareoptions.fillColor == 'quantile') {
        const value = parseFloat(row[layerinfo.quantilefield]);
        const breaks = QUANTILEBREAKS[layerinfo.id];
        const rawvals = RAWVALS[layerinfo.id]; 
        const colors = layerinfo.quantilecolors;
        squareoptions.fillColor = pickColorByValue(value, breaks, rawvals, colors, undefined);
    }

    const square = L.rectangle(circle.getBounds(), squareoptions);
    circle.removeFrom(MAP);

    // suggested areas get a special click behavior
    // see also the MAP click behavior which dismisses this by clicking anywhere else
    square.on('click', function () {
        square.feature = {};
        square.feature.properties = row;
        showSuggestedSiteInfo(square, row, layerinfo);
    });

    return square;
}

function circleSymbolizer (layerinfo, row) {
    // given a point data row and a layerinfo from the county's data profile,
    // return a Leaflet layer (here, a L.Circle) suited to adding to the new layergroup
    const circleoptions = Object.assign({}, layerinfo.circle);
    circleoptions.interactive = layerinfo.popupnamefield ? true : false;
    circleoptions.bubblingMouseEvents = false;
    circleoptions.pane = layerinfo.mapzindex ? layerinfo.mapzindex : 'medium';

    if (circleoptions.fillColor == 'quantile') {
        const value = parseFloat(row[layerinfo.quantilefield]);
        const breaks = QUANTILEBREAKS[layerinfo.idnum];
        const rawvals = RAWVALS[layerinfo.idnum];
        const colors = layerinfo.quantilecolors;

        const thiscolor = pickColorByValue(value, breaks, rawvals, colors, undefined);
        circleoptions.fillColor = thiscolor;
    }

    const circle = L.circle([row.lat, row.lon], circleoptions);

    // compose a popup of Type and Name; type may be a fixed string or a field in the CSV
    if (layerinfo.popupnamefield) {
        const name = layerinfo.popupnametext ? layerinfo.popupnametext : row[layerinfo.popupnamefield];
        const type = layerinfo.popuptypetext ? layerinfo.popuptypetext : row[layerinfo.popuptypefield];

        const htmllines = [];
        if (type) htmllines.push(`<b>Type:</b> ${type.toTitleCase()}`);
        if (name) htmllines.push(`<b>Name</b>: ${name.toTitleCase()}`);

        if (htmllines.length) {  // no text fields = no lines = no popup
            let popuphtml = htmllines.join('<br />');
            circle.bindPopup(popuphtml);
        }
    }

    return circle;
}

function getLayerInfoByid (layerid) {
    let foundlayer;
    Object.keys(COUNTYINFO.datalayers).forEach(function (groupname) {
        COUNTYINFO.datalayers[groupname].forEach(function (layerinfo) {
            if (layerinfo.id == layerid) foundlayer = Object.assign({}, layerinfo);  // return a copy, no mutating  ;)
        });
    });
    return foundlayer;
}

function findCheckboxForLayerId (layerid) {
    const $sections = $('#sidebar div[data-section]');
    const $checkbox = $sections.find(`input[type="checkbox"][name="layers"][value="${layerid}"]`);
    if (! $checkbox.length) throw new Error(`findCheckboxForLayerId() no checkbox for ${layerid}`);
    return $checkbox;
}

function showSuggestedSiteInfo (square, row, layerinfo) {
    // passing a single null is OK = stop highlighting any sugegsted site
    if (! row) {
        MAP.SUGGESTEDAREAHIGHLIGHT.clearLayers();
        MAP.removeControl(MAP.SUGGESTEDAREACONTROL);
        return;
    }

    // highlight the square on the map, by drawing a second square at the same latlng+center but with this highlight style
    const highlightsquareoptions = Object.assign({}, HIGHLIGHT_SUGGESTED_AREA);
    highlightsquareoptions.radius = square.options.radius;
    highlightsquareoptions.pane = 'highlights';

    const highlightsquare = L.rectangle(square.getBounds(), highlightsquareoptions);
    MAP.SUGGESTEDAREAHIGHLIGHT.clearLayers().addLayer(highlightsquare);

    // show the Suggested Area Details map control, and fill in the details
    const siteid = square.feature.properties.idnum;
    const scores = SITESCORES[siteid];

    const stats = {};
    stats.vage = scores['dens.cvap.std'] >= SITESCOREBREAKS['dens.cvap.std'][2] ? 'hi' : scores['dens.cvap.std'] >= SITESCOREBREAKS['dens.cvap.std'][1] ? 'md' : 'lo';
    stats.cowo = scores['dens.work.std'] >= SITESCOREBREAKS['dens.work.std'][2] ? 'hi' : scores['dens.work.std'] >= SITESCOREBREAKS['dens.work.std'][1] ? 'md' : 'lo';
    stats.popd = scores['popDens.std'] >= SITESCOREBREAKS['popDens.std'][2] ? 'hi' : scores['popDens.std'] >= SITESCOREBREAKS['popDens.std'][1] ? 'md' : 'lo';
    stats.pcar = scores['prc.CarAccess.std'] >= SITESCOREBREAKS['prc.CarAccess.std'][2] ? 'hi' : scores['prc.CarAccess.std'] >= SITESCOREBREAKS['prc.CarAccess.std'][1] ? 'md' : 'lo';
    stats.nonv = scores['prc.ElNonReg.std'] >= SITESCOREBREAKS['prc.ElNonReg.std'][2] ? 'hi' : scores['prc.ElNonReg.std'] >= SITESCOREBREAKS['prc.ElNonReg.std'][1] ? 'md' : 'lo';
    stats.disb = scores['prc.disabled.std'] >= SITESCOREBREAKS['prc.disabled.std'][2] ? 'hi' : scores['prc.disabled.std'] >= SITESCOREBREAKS['prc.disabled.std'][1] ? 'md' : 'lo';
    stats.latn = scores['prc.latino.std'] >= SITESCOREBREAKS['prc.latino.std'][2] ? 'hi' : scores['prc.latino.std'] >= SITESCOREBREAKS['prc.latino.std'][1] ? 'md' : 'lo';
    stats.noen = scores['prc.nonEngProf.std'] >= SITESCOREBREAKS['prc.nonEngProf.std'][2] ? 'hi' : scores['prc.nonEngProf.std'] >= SITESCOREBREAKS['prc.nonEngProf.std'][1] ? 'md' : 'lo';
    stats.povr = scores['prc.pov.std'] >= SITESCOREBREAKS['prc.pov.std'][2] ? 'hi' : scores['prc.pov.std'] >= SITESCOREBREAKS['prc.pov.std'][1] ? 'md' : 'lo';
    stats.yout = scores['prc.youth.std'] >= SITESCOREBREAKS['prc.youth.std'][2] ? 'hi' : scores['prc.youth.std'] >= SITESCOREBREAKS['prc.youth.std'][1] ? 'md' : 'lo';
    stats.vbmr = scores['rate.vbm.std'] >= SITESCOREBREAKS['rate.vbm.std'][2] ? 'hi' : scores['rate.vbm.std'] >= SITESCOREBREAKS['rate.vbm.std'][1] ? 'md' : 'lo';
    stats.poll = scores['dens.poll.std'] >= SITESCOREBREAKS['dens.poll.std'][2] ? 'hi' : scores['dens.poll.std'] >= SITESCOREBREAKS['dens.poll.std'][1] ? 'md' : 'lo';

    // feed the stats into the control and open it
    MAP.addControl(MAP.SUGGESTEDAREACONTROL);
    MAP.SUGGESTEDAREACONTROL.updateLegend(stats);
}

function formatValueText (value, legendformat) {
    // for formatting values read in legend
    let valuetext = value;  // start with the value. format it below with rounding, adding %, whatever

    switch (legendformat) {
        case 'decimal':
            valuetext = value.toFixed(1);
            break;
        case 'percent':
            valuetext = (100 * value).toFixed(1) + '%';
            break;
        case 'integer':
            valuetext = Math.round(value).toLocaleString();
            break;
    }
    return valuetext;
}

function formatValue (value, legendformat) {
    // for rounding raw values to match legend format
    switch (legendformat) {
        case 'decimal':
            value = Number(parseFloat(value).toFixed(1));
            break;
        case 'percent':
            value = Number(parseFloat(value).toFixed(3));
            break;
        case 'integer':
            value = Math.round(value);
            break;
    }
    return value;
}

function pickColorByValue (value, breaks, rawvals, colors, legendformat) {
    if (! breaks || isNaN(value)) return NODATA_COLOR;
    
    // start with the highest color, work downward until we find our value >=X, and that's our break
    let color;
    if (rawvals == true) { 
        var i = breaks.length; 
    } else { 
        var i = breaks.length-2; 
    }; 
    for (i; i>=0; i--) {
        // be sure to round values before setting color since values were rounded when creating breaks 
        if (legendformat) { value = formatValue(value, legendformat) };
        if (value >= breaks[i]) { color = colors[i]; break; }
    }
    return color;
}

function getBreaks (layerinfo, values) {
    values = values.map(function(value) { return parseFloat(value); }).filter(function(value) { return ! isNaN(value); });
    values.sort(function(a,b) { return a - b;});
    // if indicator data then first format since legend values are formatted later
    if (layerinfo) {
        var formattedvalues = new Array();
        values.forEach(function (value) { 
            formattedvalues.push(formatValue(value, layerinfo.legendformat));
        });
        var uniquevalues = formattedvalues.unique();
    } else {
        var uniquevalues = values.unique();
    }
    // only use standard quantile breaks if more than 5 unique values 
    // otherwise just set breaks as raw values
    if (uniquevalues.length < 6) {
        var rawvals = true;
        if (layerinfo) {
            var breaks = new Array();
            uniquevalues.forEach(function (value) { 
                breaks.push(formatValue(value, layerinfo.legendformat));
            });
        }
        else {
            var breaks = uniquevalues;
        };
    }
    else {
        var rawvals = false
        var quantiles = ss.quantile(uniquevalues, [0, 0.2, 0.4, 0.6, 0.8, 1]);
        // check if repeat values in quantiles
        // if so then create artifical quantile to replace repeated value
        // unless artifical quintile equals the real quintile after rounding
        // in this case remove the quintile
        const quantilesunique = Array.from(new Set(quantiles))
        if (quantiles.length != quantilesunique.length) {
            for (let i = quantiles.length - 1; i > 0; i--) {
                if (quantiles[i] === quantiles[i-1]) {
                    if ((layerinfo) && (quantilesunique.length < 3)) {
                        let replacement = formatValue((quantiles[i] + quantiles[i+1])/2, layerinfo.legendformat);
                        if (replacement == quantiles[i]) {
                            let removed = quantiles.splice(i, 1);
                        } else {
                            quantiles[i] = replacement;
                        };
                    } else {
                        let removed = quantiles.splice(i, 1);
                    };
                };
            };
        };
        // set layer breaks property to final quantile array
        var breaks = quantiles;
    };
    breaks = breaks.unique().sort(function(a,b) { return a - b;});
    return [breaks, rawvals];
}

function busySpinner (showit) {
    const $modal = $('#modal-busy');
    if (showit) $modal.modal('show');
    else $modal.modal('hide');
}
