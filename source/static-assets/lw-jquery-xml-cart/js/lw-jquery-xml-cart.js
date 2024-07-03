/*!
  jQuery XML Store / Shop - Shopping Cart
  Created by livelyworks - http://livelyworks.net
  Ver. 3.5.0 - 22 JUN 2023
*/
(function (window, $, undefined) {
    "use strict";
    _.templateSettings.variable = "_oData";

    if (!window.__jxss) {
        window.__jxss = {};
    }

    /*
        Configuration Options
    */

    var configOptions = {
        configXMLFile: window.__jxss.configXMLFile ? window.__jxss.configXMLFile : "data-provider/config.xml",
        productsXMLFile: window.__jxss.productsXMLFile ? window.__jxss.productsXMLFile : "data-provider/products.xml",
        storeName: "",
        logoImage: "",
        currencySymbol: "$",
        currency: "USD",
        businessEmail: "",
        fromEmail: "",
        usePaypal: true,
        useSubmitOrderByEmail: true,
        shippingCharges: 0,
        searchProductDetails: true,
        searchProductIds: true,
        searchCategoryIds: true,
        bs3Theme: $('body').hasClass('bs-3') ? true : false,
        bs4Theme: $('body').hasClass('bs-4') ? true : false,
        paypalBaseURL: "https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1&charset=utf-8&currency_code=",
        submitOrderBaseURL: 'scripts/cart-mailer.php'
    },
        /*
            General Variables
        */
        allProductsCollection = {},
        categoriesCollection = {},
        currentProductCollection = {},
        oCurrentProductData = {},
        searchedProductsCollection = {},
        cartProductsCollection = new Array(),
        DateTime = new Date(),
        cartStats = {},
        totalBtnMarkup = '',
        selectedProductOptions = {},
        nProductInCart = false,
        nProductIndexInCart = false,
        generalVars = {
            categoryIdentifierInURL: "uid-",
            isStoreLoaded: false,
            lastAccessedCategory: null,
            hashChanged: false,
            preventHashChangedAction: false,
            cartStorageName: 'store-cart-storage' + window.location.hostname,
            qtyUpdateTimeout: null,
            searchDelayTimeout: null,
            showSubmitOrderTimeout: null,
            enableOrderBtn: false,
            isDemoActivate: false,
            preventHashChange: false,
            initialBreadcrumb: '<li class="breadcrumb-item"><a data-categoryindex="all" href="#/category/uid-all" class="category-link-all category-link">All</a></li>',
            parentCategoriesString: ''
        },
        nCategoryIndex = 0,
        nProductIndex = 0,
        /*
            DOM elements
        */
        $domElements = {
            storeLogo: $('#storeLogo'),
            checkoutWithPaypalBtn: $('#checkoutWithPaypal'),
            checkoutSubmitOrderBtn: $('#checkoutSubmitOrder'),
            loaderContainer: $('#loaderContainer'),
            mainContainer: $('#mainContainer'),
            modalCommon: $('#commonModal'),
            modalContainer: (configOptions.bs3Theme || configOptions.bs4Theme) ? $('.common-modal-content') : $('#commonModal'),
            categoriesList: $('#categoriesList'),
            storeLoaderStatusText: $('.lw-loading-status'),
            productsContainer: $('#productsContainer'),
            storeWaitingText: $('.lw-waiting-text'),
            addToCartBtnContainer: $('#addToCartBtnContainer'),
            productsBreadcrumb: $('#productsBreadcrumb'),
            shoppingCartBtnContainer: $('.shopping-cart-btn-container'),
            searchInput: $('input.search-product'),
            clearSearchBtn: $('.clear-search-result-btn'),
            footerStoreName: $('.footer-store-name'),
            goToTop: $('.go-to-top'),
            searchedProductCounts: $('#searchedProductCounts')
        },

        /*
            Templates to process as _ (underscore templates)
        */
        _templates = {
            sidebarCategories: _.template($("script.sidebar-categories-template").html()),
            productsGrid: _.template($("script.products-grid-template").html()),
            productsDetailsModal: _.template($("script.products-details-modal-template").html()),
            productsOptionsPopover: _.template($("script.product-options-popover-template").html()),
            shoppingCartModal: _.template($("script.shopping-cart-template").html()),
            addToCartBtn: _.template($("script.add-to-cart-btn-template").html()),
            shoppingCartBtn: _.template($("script.shopping-cart-btn-template").html()),
            submitOrderFormModal: _.template($("script.submit-order-form-template").html())
        },

        /*
            Object contains miscellaneous functions as helpers
        */
        fnMisc = {

            /*
                object length
            */
            objectLength: function (obj) {
                return _.allKeys(obj).length;
            },

            /*
                Format amount using currency symbol
            */
            fullFormatAmount: function (amt) {
                return configOptions.currencySymbol + " " + new Number(amt).toFixed(2) + " " + configOptions.currency;
            },
            /*
                Format amount using currency symbol & code
            */
            formatAmount: function (amt) {
                return configOptions.currencySymbol + " " + new Number(amt).toFixed(2);
            },
            /*
                Create url friendly string
            */
            convertToSlug: function (string) {
                return string
                    .toLowerCase()
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '')
                    ;
            },
            /*
                extract data from URL & convert it to object
            */
            dataFromURL: function () {
                return _.object(
                    _.compact(
                        _.map(location.hash.slice(1).split('/'), function (urlItem) {
                            if (urlItem) {
                                return urlItem.split("id-");
                            }
                        }))
                );
            },
            /*
                Go to top method
            */
            goToTop: function (e) {

                if (e) {
                    e.preventDefault();
                }

                $("html, body").animate({
                    scrollTop: "0px"
                }, {
                    duration: 200,
                    easing: "swing"
                });
            },
            /*
                On resize
            */
            resizeNPosition: function () {

                $('body').css({
                    'padding-top': $('.lw-header-container').outerHeight()
                });

                if (configOptions.bs4Theme) {
                    $('body.bs-4 .content-container').css({
                        'padding-top': $('.lw-breadcrumb-container').outerHeight()
                    });
                }

                $domElements.loaderContainer.css({
                    top: ($(window).height() * 0.5) - ($domElements.loaderContainer.height() * 0.5),
                    left: ($(window).width() * 0.5) - ($domElements.loaderContainer.width() * 0.5)
                });
            }
        };

    fnMisc.resizeNPosition();

    _.delay(function () {
        fnMisc.resizeNPosition();
    }, 300);

    $domElements.storeLoaderStatusText.html('Loading configurations...');

    /*
        Load Config Data from XML
    */
    $.ajax({
        type: "GET",
        url: configOptions.configXMLFile + "?file=" + DateTime.getTime(),
        dataType: "xml",
        success: function (configData) {

            $domElements.storeLoaderStatusText.html('Loading loaded...');

            var configEl = $(configData).find('configuration')[0];

            /*
                logo image 
            */
            configOptions.logoImage = $(configEl).attr('logoImage');

            configOptions.storeName = $(configEl).attr('storeName');

            $domElements.footerStoreName.html(configOptions.storeName);

            /* 
                currency Symbol
            */
            if ($(configEl).attr('currencySymbol')) {
                configOptions.currencySymbol = $(configEl).attr('currencySymbol');
            }
            /*
                Currency
            */
            if ($(configEl).attr('currency')) {
                configOptions.currency = $(configEl).attr('currency');
            }

            /*
                Business Email
            */
            if ($(configEl).attr('businessEmail')) {
                configOptions.businessEmail = $(configEl).attr('businessEmail');
            }

            /*
                From Email
            */
            configOptions.fromEmail = ($(configEl).attr('fromEmail')) ? $(configEl).attr('fromEmail') : configOptions.businessEmail;

            /*
                Check if allows PayPal
            */
            if ($(configEl).attr('usePaypal')) {
                configOptions.usePaypal = parseInt($(configEl).attr('usePaypal'));
            }

            /*
                Check if allows Submit Order by Email
            */
            if ($(configEl).attr('useSubmitOrder')) {
                configOptions.useSubmitOrderByEmail = parseInt($(configEl).attr('useSubmitOrder'));
            }

            /*
                Base Shipping Charges
            */
            if ($(configEl).attr('shippingCharges')) {
                configOptions.shippingCharges = parseFloat($(configEl).attr('shippingCharges'));
            }

            if ($(configEl).attr('taxPercentage')) {
                configOptions.taxPercentage = parseFloat($(configEl).attr('taxPercentage'));
            }

            configOptions.siteBaseUrl = $(configEl).attr('siteBaseUrl')
                ? $(configEl).attr('siteBaseUrl')
                : (location.origin + location.pathname).replace('index.html', '').replace('index.php', '');
            /*
                Set logo
            */
            $domElements.storeLogo.attr('src', configOptions.logoImage);
            /*
                Disable PayPal Checkout button
            */
            if (configOptions.usePaypal == 0) {
                $domElements.checkoutWithPaypalBtn.hide();
            }

            /*
                Disable Checkout button
            */
            if (configOptions.useSubmitOrderByEmail == 0) {
                $domElements.checkoutSubmitOrderBtn.hide();
            }

            /*
                basic urls for PayPal & submit order
            */
            configOptions.paypalBaseURL = configOptions.paypalBaseURL + configOptions.currency + '&business=' + configOptions.businessEmail;

            //configOptions.submitOrderBaseURL = configOptions.submitOrderBaseURL + configOptions.currency + '&business='+ configOptions.businessEmail;

            /*
                Update Status
            */
            $domElements.storeLoaderStatusText.html('Loading products data...');

            /*
                Lets load products data from XML file
            */
            $.ajax({
                type: "GET",
                url: configOptions.productsXMLFile + "?file=" + DateTime.getTime(),
                dataType: "xml",
                success: function (productsData) {

                    $('#mainContainer').show();
                    $domElements.storeLoaderStatusText.html('Intializating ...');

                    var productsXMLNodes = $(productsData).children('products');
                    /* 
                        loop through the categories
                    */
                    storeFuncs.prepareXMLProductsData(productsXMLNodes);

                    /*
                        we have all the data lets setup a store
                    */
                    storeFuncs.loadExistingCartItems();

                }
            }).fail(function (e, messageBody) {
                $domElements.storeWaitingText.html('Oooops... Failed to load Products data!!');
                $domElements.loaderContainer.find('.preloader').removeClass('preloader').addClass('lw-broken-file-link').text('');
                $domElements.storeLoaderStatusText.html('<small>' + e.statusText + ' : ' + messageBody + '</small>');
            });

        }
    }).fail(function (e, messageBody) {
        $domElements.storeWaitingText.html('Oooops... Failed to load Configuration data!!');
        $domElements.loaderContainer.find('.preloader').removeClass('preloader').addClass('lw-broken-file-link').text('');
        $domElements.storeLoaderStatusText.html('<small>' + e.statusText + ' : ' + messageBody + '</small>');
    });

    var storeFuncs = {
        /* 
            Format products XML data
        */
        prepareXMLProductsData: function (productsXMLNodes, parentCategoryID, parentLevel) {
            if (!parentLevel) {
                parentLevel = 1;
            }

            $(productsXMLNodes).children('category').each(function () {

                var $thisCatgegoryNode = $(this),
                    sThisCategoryName = $thisCatgegoryNode.attr('categoryName'),
                    sCategoryID = $thisCatgegoryNode.attr('categoryID')
                        ? fnMisc.convertToSlug($thisCatgegoryNode.attr('categoryID')) : nCategoryIndex;

                categoriesCollection[sCategoryID] = {
                    name: sThisCategoryName,
                    index: sCategoryID,
                    parentLevel: parentLevel,
                    parentCategoryIndex: parentCategoryID,
                    slug: fnMisc.convertToSlug(sThisCategoryName)
                };
                /*
                    loop through the products of this category
                */
                $thisCatgegoryNode.children('product').each(function () {

                    var $thisProductNode = $(this),
                        nOldPrice = parseFloat($thisProductNode.attr('oldPrice')),
                        nAdditionalShippingCharge = parseFloat($thisProductNode.attr('additionalShippingCharge')),
                        nTaxPercentage = parseFloat($thisProductNode.attr('taxPercentage')),
                        sThisProductName = $thisProductNode.attr('productName'),
                        sProductID = $thisProductNode.attr('productID')
                            ? fnMisc.convertToSlug($thisProductNode.attr('productID')) : nProductIndex,
                        nProductPrice = parseFloat($thisProductNode.attr('productPrice'));

                    /*
                        Products
                    */
                    var oThisProduct = allProductsCollection[sProductID] = {
                        name: sThisProductName,
                        slug: fnMisc.convertToSlug(sThisProductName),
                        thumbPath: $thisProductNode.attr('thumbPath'),
                        price: nProductPrice,
                        formattedPrice: fnMisc.formatAmount(nProductPrice),
                        fullFormattedPrice: fnMisc.fullFormatAmount(nProductPrice),
                        oldPrice: nOldPrice ? {
                            fullFormatted: fnMisc.fullFormatAmount(nOldPrice),
                            formatted: fnMisc.formatAmount(nOldPrice),
                            price: nOldPrice
                        } : null,
                        additionalShippingCharge: _.isNumber(nAdditionalShippingCharge) ? nAdditionalShippingCharge : 0,
                        taxPercentage: _.isNumber(nTaxPercentage) ? nTaxPercentage : 0,
                        id: $thisProductNode.attr('productID'),
                        index: sProductID,
                        categoryIndex: sCategoryID,
                        parentCategoryIndex: parentCategoryID,
                        details: $thisProductNode.find('details').text(),
                        productOptions: [],
                        hasAddonPrice: false,
                        calculateTax: function (totalAddonPriceForProduct, productQantity) {

                            var taxAmount = 0;

                            if (!this.taxPercentage && configOptions.taxPercentage) {
                                taxAmount = ((this.price + totalAddonPriceForProduct) * configOptions.taxPercentage) / 100;
                            } else {
                                taxAmount = ((this.price + totalAddonPriceForProduct) * this.taxPercentage) / 100;
                            }

                            if (productQantity) {
                                return productQantity * taxAmount;
                            }

                            return taxAmount;
                        },
                        calculateShipping: function (productQantity) {

                            if (!productQantity) {
                                return this.additionalShippingCharge;
                            }

                            return productQantity * this.additionalShippingCharge;
                        }
                    };

                    /*
                        product options
                    */
                    $thisProductNode.find('option').each(function () {

                        var $thisProductOptions = $(this),
                            thisProductOptionsObj = {
                                '_id': sCategoryID + '_' + sProductID + '_' + fnMisc.convertToSlug($thisProductOptions.attr('title')),
                                'title': $thisProductOptions.attr('title'),
                                'optionValues': []
                            };

                        $thisProductOptions.find('option-value').each(function () {

                            var $thisProductOption = $(this),
                                nAddonPrice = _.isNumber(parseFloat($thisProductOption.attr('addonPrice')))
                                    ? parseFloat($thisProductOption.attr('addonPrice')) : 0;

                            if (nAddonPrice > 0) {
                                oThisProduct.hasAddonPrice = true;
                            }

                            thisProductOptionsObj.optionValues.push({
                                name: $thisProductOption.text(),
                                addonPrice: nAddonPrice,
                                addonPriceFormatted: fnMisc.formatAmount(nAddonPrice),
                                value: ($thisProductOption.attr('value') ?
                                    $thisProductOption.attr('value') : $thisProductOption.text()
                                )
                            });

                        });

                        oThisProduct.productOptions[thisProductOptionsObj._id] = thisProductOptionsObj;

                    });

                    /*
                        increment product index
                    */
                    nProductIndex++;
                });

                if ($(this).children('category').length) {
                    storeFuncs.prepareXMLProductsData($(this), sCategoryID, parentLevel + 1);
                }

                /*
                    increment category index
                */
                nCategoryIndex++;
            });
        },

        /* 
            setup categories
        */
        setupCategories: function () {

            $domElements.categoriesList.find(".active-category").after(
                _templates.sidebarCategories({ categoriesCollection: categoriesCollection })
            );

            storeFuncs.setupStore();
        },

        /*
            Retrive Cart from local storage & update cart
        */
        loadExistingCartItems: function () {

            var sRetrivedExistingCartCollation = $.jStorage.get(generalVars.cartStorageName),
                retrivedExistingCartCollation = $.parseJSON(sRetrivedExistingCartCollation);
            if (retrivedExistingCartCollation && retrivedExistingCartCollation.length) {
                cartProductsCollection = retrivedExistingCartCollation;
            }

            storeFuncs.updateCart();
            storeFuncs.setupCategories();
        },
        /* 
            setup products 
        */
        setupStore: function () {

            storeFuncs.onAllComplete();
        },
        /* 
            setup products 
        */
        categoryLinkAction: function (e) {
            generalVars.preventHashChangedAction = false;
        },
        /* 
            Find parent categories
        */
        getParentCategories: function (sCategoryID, resultItems, requiredObj) {

            if (!resultItems || !resultItems.length) {
                var resultItems = [];
            }

            if (categoriesCollection[sCategoryID]) {
                if (requiredObj) {
                    resultItems.push(categoriesCollection[sCategoryID]);
                } else {
                    resultItems.push(categoriesCollection[sCategoryID].parentCategoryIndex);
                }

                storeFuncs.getParentCategories(categoriesCollection[sCategoryID].parentCategoryIndex, resultItems, requiredObj);
            }

            return resultItems;
        },
        /* 
            Find child categories
        */
        getChildCategories: function (carryCategoryID, carryChildCategories, childCategoryContainer) {

            if (!childCategoryContainer) {
                var childCategoryContainer = [];
            }

            var findChildCategories = _.where(carryChildCategories, { parentCategoryIndex: carryCategoryID });
            if (findChildCategories) {
                _.each(findChildCategories, function (childCategory) {
                    childCategoryContainer.push(childCategory.index);
                    storeFuncs.getChildCategories(childCategory.index, carryChildCategories, childCategoryContainer);
                });
            }
            return childCategoryContainer;
        },
        /* 
            load products for current catgeory
        */
        loadCategoryProducts: function (sCategoryID) {

            storeFuncs.clearSearchResult(true);

            var childCategories = storeFuncs.getChildCategories(sCategoryID, categoriesCollection);

            if (sCategoryID == 'all') {
                currentProductCollection = allProductsCollection;
                storeFuncs.updateBreadCrumb('all');
            } else {
                currentProductCollection = _.filter(allProductsCollection, function (productObj) {
                    if ((productObj.categoryIndex == sCategoryID) || _.contains(childCategories, productObj.categoryIndex)) {
                        return productObj;
                    }
                });

                storeFuncs.updateBreadCrumb(categoriesCollection[sCategoryID]);
            };

            fnMisc.goToTop();

            $domElements.categoriesList.find('.list-group-item').removeClass('active-category active');
            $domElements.categoriesList.find('.category-list-item-' + sCategoryID).addClass('active-category active');

            generalVars.lastAccessedCategory = sCategoryID;
            storeFuncs.generateProductsThumbs();

        },
        /* 
            List out the products on page
        */
        generateProductsThumbs: function () {

            if ($domElements.productsContainer.data('masonry')) {
                $domElements.productsContainer.masonry('destroy')
            }

            $domElements.productsContainer.html(
                _templates.productsGrid({ currentProductCollection: currentProductCollection })
            );

            $domElements.storeLoaderStatusText.remove();
            $domElements.loaderContainer.show();

            $domElements.productsContainer.masonry({
                itemSelector: '.product-item',
                percentPosition: true,
                horizontalOrder: true,
                columnWidth: '.product-item',
                gutter: '.lw-gutter-sizer'
            });

            if (currentProductCollection.length <= 0) {
                $domElements.loaderContainer.hide();
            }

            $('.product-item-thumb-image').Lazy({
                afterLoad: function (element) {
                    // called after an element was successfully handled
                    $domElements.loaderContainer.hide();
                    $(element).parents('.product-item').addClass('fade-in');
                    $domElements.productsContainer.masonry('layout');
                    fnMisc.resizeNPosition();
                },
                onFinishedAll: function () {
                    // called once all elements was handled
                    fnMisc.resizeNPosition();
                },
                onError: function (element) {
                    // called whenever an element could not be handled
                    $domElements.loaderContainer.hide();
                    $(element).parents('.thumb-holder').addClass('lw-image-broken').parents('.product-item').addClass('fade-in');
                    $domElements.productsContainer.masonry('layout');
                    fnMisc.resizeNPosition();
                },
            });

            $('.product-item [data-toggle="popover"]').popover({
                container: '#productsContainer',
                content: function () {
                    storeFuncs.selectCurrentProduct($(this).data('productindex'));

                    return _templates.productsOptionsPopover({
                        oCurrentProductData: oCurrentProductData,
                        fnMisc: fnMisc,
                        nProductInCart: nProductInCart
                    });


                },
                html: true,
                sanitize:false
            });

            $('.product-item [data-toggle="popover"]').on('shown.bs.popover', function () {
                storeFuncs.updateAddToCartBtn();
            })

            // Close Popover if clicked outside
            $(document).on('click', function (e) {
                $('.product-item [data-toggle="popover"],.product-item [data-original-title]').each(function () {
                    //the 'is' for buttons that trigger popups
                    //the 'has' for icons within a button that triggers a popup
                    if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                        (($(this).popover('hide').data('bs.popover') || {}).inState || {}).click = false  // fix for BS 3.3.6
                    }
                });
            });
        },
        /* 
            On search click
        */
        onSearch: function () {

            clearTimeout(generalVars.searchDelayTimeout);

            /* 
                wait for some time if user still typing
            */
            generalVars.searchDelayTimeout = setTimeout(function () {

                if ($domElements.searchInput.val() == "") {
                    return false;
                }

                $domElements.clearSearchBtn.removeAttr('disabled');

                var oURLData = fnMisc.dataFromURL();

                if (oURLData.hasOwnProperty('search')) {
                    if (generalVars.preventHashChangedAction) {
                        generalVars.preventHashChangedAction = false;
                        return false;
                    }
                    storeFuncs.searchProduct();
                } else {
                    location.hash = "#/search";
                }

            }, 300);

        },
        /*
            Clear search result
        */
        clearSearchResult: function (preventSearchResult) {

            $domElements.searchInput.val("");
            $domElements.clearSearchBtn.attr('disabled', '');
            $domElements.searchedProductCounts.html('');

            if (!preventSearchResult) {
                storeFuncs.searchProduct();
            }
        },
        /*
            Search for product
        */
        searchProduct: function () {

            $domElements.categoriesList.find('.list-group-item').removeClass('active-category active');

            var sSearchTerm = $domElements.searchInput.val(),
                aSeachTerm = sSearchTerm.toLowerCase().split(' ');


            searchedProductsCollection = allProductsCollection;
            var tempSearchProductCollection = [];

            for (var i = 0; i < aSeachTerm.length; i++) {

                var sCurrentSearchTermWord = aSeachTerm[i];

                tempSearchProductCollection = [];

                for (var nProductItem in searchedProductsCollection) {

                    var oProduct = searchedProductsCollection[nProductItem],
                        sProductString = oProduct.name.toLowerCase();

                    if (configOptions.searchProductDetails) {
                        sProductString += oProduct.details.toLowerCase();
                    }

                    if (configOptions.searchProductIds) {
                        sProductString += oProduct.index;
                    }

                    if (configOptions.searchCategoryIds) {
                        sProductString += oProduct.categoryIndex;
                    }

                    if (sProductString.indexOf(sCurrentSearchTermWord) > -1) {
                        tempSearchProductCollection.push(oProduct);
                    }
                }

                searchedProductsCollection = tempSearchProductCollection;

            };

            generalVars.lastAccessedCategory = 'search';

            $domElements.searchedProductCounts.html(searchedProductsCollection.length + ' product(s) found');

            if (!_.isEqual(currentProductCollection, searchedProductsCollection)) {

                currentProductCollection = searchedProductsCollection;
                storeFuncs.generateProductsThumbs();

            }
        },
        /* 
            show product details 
        */
        selectCurrentProduct: function (nProductIndexID) {

            oCurrentProductData = allProductsCollection[nProductIndexID];

            if (!oCurrentProductData) {
                return false;
            }

            selectedProductOptions = {};

            if (fnMisc.objectLength(oCurrentProductData.productOptions) > 0) {
                for (var productOptionKey in oCurrentProductData.productOptions) {
                    var productOption = oCurrentProductData.productOptions[productOptionKey];

                    selectedProductOptions[productOption._id] = {
                        value: productOption.optionValues[0].value,
                        name: productOption.optionValues[0].name,
                        optionTitle: productOption.title,
                    };
                };
            }

            nProductInCart = storeFuncs.itemExistInCart();
        },
        /* 
            show product details 
        */
        productDetails: function (nProductIndexID) {

            storeFuncs.selectCurrentProduct(nProductIndexID);

            $domElements.modalContainer.html(
                _templates.productsDetailsModal({
                    oCurrentProductData: oCurrentProductData,
                    fnMisc: fnMisc,
                    categoriesCollection: categoriesCollection
                })
            );

            storeFuncs.updateAddToCartBtn();
            storeFuncs.openModal();
        },
        /* 
            show shopping cart 
        */
        showShoppingCart: function (oOptions) {

            $domElements.modalContainer.html(
                _templates.shoppingCartModal({
                    cartProductsCollection: cartProductsCollection,
                    allProductsCollection: allProductsCollection,
                    configOptions: configOptions,
                    fnMisc: fnMisc,
                    generalVars: generalVars,
                    cartStats: cartStats
                })
            );

            if (oOptions && oOptions.preventModelReLoad) {
                return false;
            }

            storeFuncs.openModal();

            storeFuncs.updateAddToCartBtn();


            if (!generalVars.isStoreLoaded) {
                storeFuncs.loadCategoryProducts('all');
            }
        },
        /* 
            let the system know that you back from any of the modal functionality 
            & it don't need to rearange products of that particuler category 
        */
        backFromModal: function () {

            $domElements.mainContainer.removeClass('main-container-additions');

            if (generalVars.preventHashChange) {
                generalVars.preventHashChange = false;
                return false;
            }

            generalVars.preventHashChangedAction = true;

            if (generalVars.lastAccessedCategory == 'search') {
                location.hash = "#/search";
            } else {
                location.hash = "#/category/uid-" + generalVars.lastAccessedCategory;
            }
        },
        /* 
            Update add to cart button based on the existance of that product with selected categories 
        */
        updatedSelectedOption: function (e) {

            e.preventDefault();

            var $this = $(this),
                sCurrentOptionSelected = $this.find('option:selected').val(),
                sCurrentOptionSelectedId = $this.data('id');

            if (fnMisc.objectLength(oCurrentProductData.productOptions[sCurrentOptionSelectedId].optionValues) > 0) {
                _.each(oCurrentProductData.productOptions[sCurrentOptionSelectedId].optionValues, function (productOptionValue) {

                    if (productOptionValue.value == sCurrentOptionSelected) {
                        selectedProductOptions[sCurrentOptionSelectedId] = {
                            value: productOptionValue.value,
                            name: productOptionValue.name,
                            optionTitle: oCurrentProductData.productOptions[sCurrentOptionSelectedId].title,
                        };
                    }
                });
            }

            return storeFuncs.updateAddToCartBtn();
        },
        /*
            Grid add (or increment product quantity if already in cart) product to cart
        */
        addToCartGridItem: function (e) {
            e.preventDefault();

            if (!oCurrentProductData) {
                return false;
            }

            storeFuncs.addToCart(e, parseInt($('.product-item .item-product-qty').val()));
        },
        /*
            add (or increment product quantity if already in cart) product to cart
        */
        addToCart: function (e, requestedQty) {

            if (!requestedQty) {
                requestedQty = parseInt($('.modal .item-product-qty').val());
            }

            if (e) {
                e.preventDefault();
            }

            if (storeFuncs.itemExistInCart()) {

                if (requestedQty && (cartProductsCollection[generalVars.nProductIndexInCart].qty != requestedQty)) {
                    cartProductsCollection[generalVars.nProductIndexInCart].qty = requestedQty
                } else {
                    cartProductsCollection[generalVars.nProductIndexInCart].qty++;
                }

                storeFuncs.updateCart();
                return storeFuncs.updateAddToCartBtn();

            }

            /*
                Its not in the cart, lets add it.
            */
            cartProductsCollection.push({
                index: oCurrentProductData.index,
                options: _.extend({}, selectedProductOptions),
                qty: (requestedQty && _.isNumber(requestedQty)) ? requestedQty : 1
            });

            storeFuncs.updateCart();
            return storeFuncs.updateAddToCartBtn();
        },
        /*
            Update Shopping cart
        */
        updateCart: function () {

            try {
                cartStats.totalItems = 0;
                cartStats.subTotal = 0;
                cartStats.totalTaxes = 0;
                cartStats.totalShippingCharges = 0;
                /*
                    Store cart in storage, so on refresh of page we can get it again
                */
                $.jStorage.set(generalVars.cartStorageName, $.toJSON(cartProductsCollection));


                for (var nCartItem in cartProductsCollection) {
                    var oCurrentCartItem = cartProductsCollection[nCartItem],
                        oCurrentProductItem = allProductsCollection[oCurrentCartItem.index],
                        totalAddonPriceForProduct = 0;

                    if (!oCurrentProductItem) {
                        cartProductsCollection = new Array();
                        break;
                    }

                    if (!_.isEmpty(oCurrentCartItem.options)) {
                        _.each(oCurrentCartItem.options, function (listItemOption, listItemOptionKey) {
                            var listOptionValueDetails = _.findWhere(oCurrentProductItem.productOptions[listItemOptionKey].optionValues, { value: listItemOption.value });

                            if (listOptionValueDetails.addonPrice) {
                                totalAddonPriceForProduct = totalAddonPriceForProduct + listOptionValueDetails.addonPrice;
                            }
                        });
                    };

                    if (oCurrentProductItem.additionalShippingCharge) {
                        cartStats.totalShippingCharges += oCurrentProductItem.calculateShipping(oCurrentCartItem.qty);
                    }

                    if (oCurrentProductItem.taxPercentage || configOptions.taxPercentage) {
                        cartStats.totalTaxes += oCurrentProductItem.calculateTax(totalAddonPriceForProduct, oCurrentCartItem.qty);
                    }

                    cartStats.totalItems += oCurrentCartItem.qty;
                    cartStats.subTotal += ((oCurrentProductItem.price + totalAddonPriceForProduct) * oCurrentCartItem.qty);
                }

                if (configOptions.shippingCharges) {
                    cartStats.totalShippingCharges += configOptions.shippingCharges;
                }

                cartStats.amountFormatted = fnMisc.fullFormatAmount(cartStats.subTotal);

                generalVars.enableOrderBtn = (cartProductsCollection.length > 0) ? true : false;

                $domElements.shoppingCartBtnContainer.html(
                    _templates.shoppingCartBtn({ cartStats: cartStats })
                );

            } catch (err) {
                cartProductsCollection = new Array();
                $.jStorage.set(generalVars.cartStorageName, $.toJSON([]));
                storeFuncs.updateCart();
            }

        },
        /*
            Update product qty from the cart
        */
        updateCartItemQty: function () {
            clearTimeout(generalVars.qtyUpdateTimeout);
            var $this = $(this),
                nQtyValue = Math.ceil(new Number($this.val())),
                nCartRowIndex = $this.data('cartrowindex');

            if (nQtyValue < 1) {
                $this.val(1);
                return false;
            }

            generalVars.qtyUpdateTimeout = setTimeout(function () {
                cartProductsCollection[nCartRowIndex].qty = nQtyValue;
                storeFuncs.updateCart();

                storeFuncs.showShoppingCart({ preventModelReLoad: true });
            }, 300);
        },
        /*
            Remove product from cart
        */
        removeCartItem: function (e) {
            var nCartRowIndex = $(this).data('cartrowindex');

            cartProductsCollection.splice(nCartRowIndex, 1);
            storeFuncs.updateCart();
            storeFuncs.showShoppingCart({ preventModelReLoad: true });
        },
        /*
            Update add to cart button to update
        */
        updateAddToCartBtn: function () {

            $domElements.addToCartBtnContainer = $('#addToCartBtnContainer');
            nProductInCart = storeFuncs.itemExistInCart();

            $('#addToCartBtnContainer').html(
                _templates.addToCartBtn({ nProductInCart: nProductInCart })
            );

            $('#productsContainer .item-product-qty, .modal .item-product-qty').val(nProductInCart ? nProductInCart : 1);
            $('#productsContainer .lw-popover-content .add-to-cart-btn-grid-item-save').text(nProductInCart ? 'Update' : 'Add');

            return nProductInCart;
        },
        /*
            Check if the product already in cart with selected options
        */
        itemExistInCart: function () {

            generalVars.nProductIndexInCart = false;

            for (var nCartItem in cartProductsCollection) {
                var oCurrentCartItem = cartProductsCollection[nCartItem];

                if (oCurrentCartItem.index == oCurrentProductData.index) {

                    var matchedOptions = 0;

                    for (var optionItemKey in oCurrentCartItem.options) {

                        if (oCurrentCartItem.options[optionItemKey].value == selectedProductOptions[optionItemKey].value) {

                            matchedOptions++;
                        }

                    }

                    if (matchedOptions === fnMisc.objectLength(oCurrentCartItem.options)) {

                        generalVars.nProductIndexInCart = nCartItem;

                        return oCurrentCartItem.qty;

                        break;

                    }



                }
            };

            return false;
        },
        /*
            Breadcrumb on product Mouseover
        */
        updateBreadCrumbOnOver: function () {
            var nMouseOveredProductIndexID = $(this).data('productindex'),
                getMouseOveredProudct = allProductsCollection[nMouseOveredProductIndexID],
                getMouseOveredProudctCategory = categoriesCollection[getMouseOveredProudct.categoryIndex];
            $domElements.productsBreadcrumb.html(generalVars.parentCategoriesString + ((getMouseOveredProudct) ? '  <li class="breadcrumb-item">' + getMouseOveredProudct.name + '</li>' : '</li>'));
        },
        /*
            Update product breadcrumb values
        */
        updateBreadCrumb: function (oProudctCategory, oProduct) {

            var parentCategoriesString = generalVars.initialBreadcrumb;

            if (oProudctCategory == 'all') {
                $domElements.productsBreadcrumb.html(parentCategoriesString);
            } else {

                var parentCategories = storeFuncs.getParentCategories(oProudctCategory.index, null, true);

                _.each(parentCategories.reverse(), function (parentCategoryItem) {
                    parentCategoriesString += '<li class="breadcrumb-item"><a data-categoryindex="all" href="#/category/uid-'
                        + parentCategoryItem.index + '" class="category-link-'
                        + parentCategoryItem.index + ' category-link">'
                        + parentCategoryItem.name + '</a></li>';
                });
            }

            generalVars.parentCategoriesString = parentCategoriesString;
            $domElements.productsBreadcrumb.html(parentCategoriesString);
        },
        /*
            Go to submit order form
        */
        proceedToOrderByEmail: function (e) {
            e.preventDefault();

            generalVars.preventHashChange = true;

            if (!generalVars.enableOrderBtn) {
                return false;
            } else {
                storeFuncs.closeAllModals();

                clearTimeout(generalVars.showSubmitOrderTimeout);
                generalVars.showSubmitOrderTimeout = setTimeout(function () {

                    $domElements.modalContainer.html(
                        _templates.submitOrderFormModal
                    );

                    storeFuncs.openModal();

                    $('#submitOrderForm').validate();
                    $('.required').on('keyup change', storeFuncs.validateSubmitOrderForm);

                }, 500);
            };
        },
        /*
            Submit Order
        */
        submitOrder: function (e) {
            e.preventDefault();

            //       throw Error('-------------------------------');

            if (!generalVars.enableOrderBtn) {
                return false;
            } else if (storeFuncs.validateSubmitOrderForm()) {

                if (generalVars.isDemoActivate) {
                    return storeFuncs.onOrderSubmitted({
                        adminMailSent: 1,
                        customerMailSent: 1
                    });
                }

                $('.lw-errors-container').addClass('hidden').find('.lw-error-*').addClass('hidden');

                generalVars.enableOrderBtn = false;

                var orderData = {
                    businessDetails: {
                        email: configOptions.businessEmail,
                        fromEmail: configOptions.fromEmail,
                        logoImage: configOptions.logoImage,
                        storeName: configOptions.storeName
                    },
                    formDetails: $('#submitOrderForm').serializeArray(),
                    cartDetails: storeFuncs.cartProductsURLGeneration(true),
                    requestValidation: 'via-submit-order'
                };

                orderData.cartDetails.cartLength = (cartProductsCollection.length + 1);
                orderData.cartDetails.currencyCode = configOptions.currency;
                orderData.cartDetails.currencySymbol = configOptions.currencySymbol;

                $.ajax({
                    url: configOptions.submitOrderBaseURL,
                    data: orderData,
                    type: 'POST',
                    dataType: 'JSON'
                })
                    .done(function (returnData) {

                        if (returnData.error) {

                            var $errorsContainer = $('.lw-errors-container');
                            $errorsContainer.removeClass('hidden');

                            $errorsContainer.find('.lw-other-error-message').html(returnData.message).removeClass('hidden');

                            $('.lw-error-' + returnData.field).removeClass('hidden');

                            generalVars.enableOrderBtn = true;

                            $('.error').first().trigger('focus');

                        } else {
                            storeFuncs.onOrderSubmitted(returnData);
                        }

                    })
                    .fail(function () {

                        generalVars.enableOrderBtn = true;
                        $('.order-page-body').html("Order Submission failed, try again");

                    });

            } else {
                $('.error').first().trigger('focus');
            };

        },

        onOrderSubmitted: function (oReturnData) {

            if (oReturnData.adminMailSent) {

                var customerMailMessage = '<br/> Order details has been sent to your email.';

                if (!oReturnData.customerMailSent) {
                    customerMailMessage = '<br/> but having some technical issues sending order details is failed, we will get back to you soon.'
                }

                $('.order-page-header').html("Your Order has been placed.");
                $('.order-page-body').html("Thank you for your Order, " + customerMailMessage);

                $('#backToCartBtn, #submitOrderBtn').hide();
                $('.order-page-close-btn').show();

                cartProductsCollection = new Array();
                storeFuncs.updateCart();
            } else {

                generalVars.enableOrderBtn = true;
            }
        },
        /*
            Check if the form is Validated or not
        */
        validateSubmitOrderForm: function () {

            var isSubmitFormValid = $('#submitOrderForm').valid();

            if (isSubmitFormValid) {
                $('#submitOrderBtn').removeAttr('disabled').removeClass('disabled');
            } else {
                $('#submitOrderBtn').attr('disabled', 'disabled').addClass('disabled', 'disabled');
            }

            return isSubmitFormValid;

        },
        /*
            User back from Order submit form Modal to Cart
        */
        backToCartFromSubmitForm: function (e) {

            e.preventDefault();
            storeFuncs.closeAllModals();

            generalVars.preventHashChange = true;

            clearTimeout(generalVars.showSubmitOrderTimeout);
            generalVars.showSubmitOrderTimeout = setTimeout(function () {

                storeFuncs.showShoppingCart({ preventModelReLoad: true });
                storeFuncs.openModal();

            }, 500);
        },
        /*
            PayPal Checkout
        */
        paypalCheckout: function (e) {

            e.preventDefault();

            if (!generalVars.enableOrderBtn) {
                return false;
            }

            var paypalCheckoutURL = configOptions.paypalBaseURL + storeFuncs.cartProductsURLGeneration();

            window.open(paypalCheckoutURL);
            return true;

        },
        /*
            Generating URL to send products to mailer script or PayPal
        */
        cartProductsURLGeneration: function (returnAsData) {

            var itemsCartIndex = 1,
                sCartProductsURL = "",
                totalShippingCharges = 0,
                totalTaxes = 0,
                totalAmount = 0,
                orderData = {
                    products: []
                };

            for (var nCartItem in cartProductsCollection) {
                var oCurrentCartItem = cartProductsCollection[nCartItem],
                    orderItem = {},
                    oCurrentProductData = allProductsCollection[oCurrentCartItem.index];

                sCartProductsURL += '&item_name_' + itemsCartIndex + '=' + oCurrentProductData.name;

                orderItem.name = oCurrentProductData.name;
                orderItem.thumbLink = configOptions.siteBaseUrl + oCurrentProductData.thumbPath;
                orderItem.itemLink = configOptions.siteBaseUrl + '#/product/uid-' + oCurrentProductData.index + '/' + oCurrentProductData.slug;

                orderItem.options = [];

                var totalAddonPriceForProduct = 0;

                for (var cartProductOptionKey in oCurrentCartItem.options) {

                    var cartProductOption = oCurrentCartItem.options[cartProductOptionKey],
                        listOptionValueDetails = _.findWhere(oCurrentProductData.productOptions[cartProductOptionKey].optionValues, { value: cartProductOption.value });

                    var orderItemOptions = {
                        title: cartProductOption.optionTitle,
                        value: cartProductOption.value
                    };

                    if (listOptionValueDetails.addonPrice) {
                        orderItemOptions.addonPrice = listOptionValueDetails.addonPrice;
                        totalAddonPriceForProduct = totalAddonPriceForProduct + listOptionValueDetails.addonPrice;
                    }

                    sCartProductsURL += (' ' + cartProductOption.optionTitle + ': ' + cartProductOption.value);

                    orderItem.options.push(orderItemOptions);
                }

                if (oCurrentProductData.additionalShippingCharge) {

                    orderItem.shippingCharges = oCurrentProductData.calculateShipping(oCurrentCartItem.qty);

                    totalShippingCharges += orderItem.shippingCharges;
                }

                if (oCurrentProductData.taxPercentage || configOptions.taxPercentage) {

                    orderItem.taxes = oCurrentProductData.calculateTax(totalAddonPriceForProduct, oCurrentCartItem.qty);
                    totalTaxes += orderItem.taxes;
                }

                orderItem.id = oCurrentProductData.id;
                orderItem.qty = oCurrentCartItem.qty;
                orderItem.amount = (oCurrentProductData.price + totalAddonPriceForProduct);
                orderItem.totalAmount = (orderItem.amount * oCurrentCartItem.qty);

                sCartProductsURL += '&item_number_' + itemsCartIndex + '=' + oCurrentProductData.id;
                sCartProductsURL += '&amount_' + itemsCartIndex + '=' + orderItem.amount;
                sCartProductsURL += '&quantity_' + itemsCartIndex + '=' + oCurrentCartItem.qty;

                totalAmount += orderItem.totalAmount;

                orderData.products.push(orderItem);

                itemsCartIndex++;
            }

            orderData.totalTaxes = totalTaxes;
            orderData.totalShippingCharges = (totalShippingCharges + configOptions.shippingCharges);

            orderData.cartTotal = totalAmount;
            orderData.totalAmount = totalAmount + totalTaxes + orderData.totalShippingCharges;

            sCartProductsURL += '&tax_cart=' + totalTaxes + '&handling_cart=' + (orderData.totalShippingCharges);

            if (returnAsData) {
                return orderData;
            } else {
                return sCartProductsURL;
            }
        },
        /*
            Close all opened Modals
        */
        closeAllModals: function () {
            $domElements.modalCommon.modal('hide');
            $('.modal-backdrop').remove();
        },
        /*
            Open Modal
        */
        openModal: function () {
            storeFuncs.closeAllModals();
            $domElements.modalCommon.modal();
        },
        /*
            Load category based on hash value
        */
        categoryCalled: function (oGetURLData) {

            if (!oGetURLData.u) {
                oGetURLData.u = 'all';
            }

            oGetURLData.u = (categoriesCollection[oGetURLData.u]) ? oGetURLData.u : 'all';

            storeFuncs.loadCategoryProducts(oGetURLData.u);
        },
        /*
            Load product details based on hash value
        */
        productCalled: function (oGetURLData) {

            if (oGetURLData.u) {
                storeFuncs.productDetails(oGetURLData.u);

                $domElements.mainContainer.addClass('main-container-additions');

                if (!allProductsCollection[oGetURLData.u]) {

                    storeFuncs.loadCategoryProducts('all');
                    return false;
                }

                var nCategoryIndex = allProductsCollection[oGetURLData.u].categoryIndex

                if (!generalVars.isStoreLoaded) {
                    storeFuncs.loadCategoryProducts(nCategoryIndex);
                }

            } else {

                storeFuncs.loadCategoryProducts('all');
            }
        },

        onAllComplete: function () {

            storeFuncs.closeAllModals();

            var oURLData = fnMisc.dataFromURL();

            if (oURLData.hasOwnProperty('category')) {

                if (generalVars.preventHashChangedAction) {
                    generalVars.preventHashChangedAction = false;
                    return false;
                }

                storeFuncs.categoryCalled(oURLData);

            } else if (oURLData.hasOwnProperty('search')) {

                if (generalVars.preventHashChangedAction) {
                    generalVars.preventHashChangedAction = false;
                    return false;
                }

                storeFuncs.searchProduct();

            } else if (oURLData.hasOwnProperty('product')) {

                storeFuncs.productCalled(oURLData);

            } else if (oURLData.hasOwnProperty('shopping-cart')) {

                storeFuncs.showShoppingCart();

                /*if(oURLData.u == 'show') {

                    storeFuncs.showShoppingCart();
                }*/
            } else {
                storeFuncs.loadCategoryProducts('all');
            }

            if (!generalVars.isStoreLoaded) {
                generalVars.isStoreLoaded = true;
            }
        }
    };


    $(window).on('hashchange', function () {
        generalVars.hashChanged = true;
        storeFuncs.onAllComplete();
    });

    $(window).on('resize', fnMisc.resizeNPosition);

    $domElements.categoriesList.on('click', '.category-link', storeFuncs.categoryLinkAction);

    $domElements.productsContainer.on('click', '.add-to-cart-btn-grid-item-save', storeFuncs.addToCartGridItem);

    $domElements.modalContainer.on('click', '.lw-hash-link-action', function (e) {
        e.preventDefault();
        var hashlink = $(this).attr('href');
        _.delay(function () {
            location.hash = hashlink;
        }, 500);
    });

    $domElements.modalContainer.on('click', '.add-to-cart-btn', storeFuncs.addToCart);

    $domElements.searchInput.on('keyup', storeFuncs.onSearch);

    $domElements.clearSearchBtn.on('click',
        function () {
            storeFuncs.clearSearchResult(false);
        });

    $domElements.productsContainer.on('change',
        '.option-selector', storeFuncs.updatedSelectedOption);

    $domElements.modalContainer.on('change',
        '.option-selector', storeFuncs.updatedSelectedOption);

    $domElements.modalContainer.on('blur change',
        'input.cart-product-qty', storeFuncs.updateCartItemQty);

    $domElements.modalContainer.on('click',
        '.delete-product-from-cart', storeFuncs.removeCartItem);

    $domElements.modalContainer.on('click',
        '#checkoutWithPaypalBtn', storeFuncs.paypalCheckout);

    $domElements.modalContainer.on('click',
        '#checkoutSubmitOrderBtn', storeFuncs.proceedToOrderByEmail);

    $domElements.modalContainer.on('click',
        '#submitOrderBtn', storeFuncs.submitOrder);

    $domElements.modalContainer.on('click',
        '#backToCartBtn', storeFuncs.backToCartFromSubmitForm);

    $domElements.goToTop.on('click', fnMisc.goToTop);

    $domElements.productsContainer.on('mouseover',
        '.product-item', storeFuncs.updateBreadCrumbOnOver);
    $domElements.modalCommon.on('hidden hidden.bs.modal', storeFuncs.backFromModal);
})(window, jQuery);