<!DOCTYPE html>
<html lang="ja">
    <!--    ResourceSpace version 8.6.12117
    For copyright and license information see documentation/licenses/resourcespace.txt
    http://www.resourcespace.org/
    -->
    <head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<META HTTP-EQUIV="CACHE-CONTROL" CONTENT="NO-CACHE">
<META HTTP-EQUIV="PRAGMA" CONTENT="NO-CACHE">
<META name="description" content="「江戸川画像文庫」（管理・運営：江戸川区）は 江戸川区の記録写真をご覧いただけるサイトです。画像データの一部は自由にご活用いただくことができます。" >
<META name="keywords" content="江戸川画像文庫,江戸川区,オープンデータ">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>江戸川画像文庫</title>
<link rel="icon" type="image/png" href="https://photo.city.edogawa.tokyo.jp/filestore/system/config/header_favicon.ico" />

<!-- Load jQuery and jQueryUI -->
<script src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery-3.5.1.min.js?css_reload_key=8.6.12117"></script>
<script src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery-ui-1.12.1.min.js?css_reload_key=8.6.12117" type="text/javascript"></script>
<script src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery.layout.min.js?css_reload_key=8.6.12117"></script>
<script src="https://photo.city.edogawa.tokyo.jp/lib/js/easyTooltip.js?css_reload_key=8.6.12117" type="text/javascript"></script>
<link type="text/css" href="https://photo.city.edogawa.tokyo.jp/css/smoothness/jquery-ui.min.css?css_reload_key=8.6.12117" rel="stylesheet" />
<script src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery.ui.touch-punch.min.js"></script>
<!--[if lte IE 9]><script src="https://photo.city.edogawa.tokyo.jp/lib/historyapi/history.min.js"></script><![endif]-->
<script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery.tshift.min.js"></script>
<script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/lib/js/jquery-periodical-updater.js"></script>

    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/lib/js/contactsheet.js"></script>
    <script>
    contactsheet_previewimage_prefix = 'https://photo.city.edogawa.tokyo.jp/filestore';
    </script>
    <script type="text/javascript">
    jQuery.noConflict();
    </script>
    
<script type="text/javascript">
	ajaxLoadingTimer=500;
</script>
<script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/lib/ckeditor/ckeditor.min.js"></script><script src="https://photo.city.edogawa.tokyo.jp/lib/js/ajax_collections.js?css_reload_key=8.6.12117" type="text/javascript"></script>

<script type="text/javascript" src="/lib/plupload_2.1.8/plupload.full.min.js?8.6.12117"></script>
	<link href="/lib/plupload_2.1.8/jquery.ui.plupload/css/jquery.ui.plupload.css?8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print"  />
	<script type="text/javascript" src="/lib/plupload_2.1.8/jquery.ui.plupload/jquery.ui.plupload.min.js?8.6.12117"></script>
<script type="text/javascript" src="/lib/plupload_2.1.8/i18n/ja.js?8.6.12117"></script>

<!-- FLOT for graphs -->
<script language="javascript" type="text/javascript" src="/lib/flot/jquery.flot.min.js"></script>
<script language="javascript" type="text/javascript" src="/lib/flot/jquery.flot.time.min.js"></script>
<script language="javascript" type="text/javascript" src="/lib/flot/jquery.flot.pie.min.js"></script>
<script language="javascript" type="text/javascript" src="/lib/flot/jquery.flot.tooltip.min.js"></script>

<!-- jsTree -->
<link rel="stylesheet" href="/lib/jstree/themes/default/style.min.css">
<script src="/lib/jstree/jstree.min.js"></script>
<script src="/lib/js/category_tree.js?css_reload_key=8.6.12117"></script>

<!-- Chosen support -->

<script type="text/javascript">
var baseurl_short="/";
var baseurl="https://photo.city.edogawa.tokyo.jp";
var pagename="download_progress";
var errorpageload = "<h1></h1><p>このページの読み込み中にエラーが発生しました。 検索を実行している場合は、検索クエリを絞り込んでみてください。 問題が解決しない場合は、システム管理者に連絡してください。</p>";
var applicationname = "江戸川画像文庫";
var branch_limit="";
var branch_limit_field = new Array();
var global_cookies = "";
var global_trash_html = '<!-- Global Trash Bin (added through CentralSpaceLoad) -->';
    global_trash_html += '<div id="trash_bin">';
    global_trash_html += '<span class="trash_bin_text">削除</span>';
    global_trash_html += '</div>';
    global_trash_html += '<div id="trash_bin_delete_dialog" style="display: none;"></div>';
oktext="OK";
var scrolltopElementCentral='.ui-layout-center';
var scrolltopElementCollection='.ui-layout-south';
var scrolltopElementModal='#modal'
collection_bar_hide_empty=false;
var chosenCollection='';
</script>

<script src="/lib/js/global.js?css_reload_key=8.6.12117" type="text/javascript"></script>

<script type="text/javascript">

jQuery(document).ready(function() {
 jQuery.fn.reverse = [].reverse;
 jQuery(document).keyup(function (e)
  { 
    if(jQuery("input,textarea").is(":focus"))
    {
       // don't listen to keyboard arrows when focused on form elements
           }
    else if (jQuery('#lightbox').is(':visible'))
        {
        // Don't listen to keyboard arrows if viewing resources in lightbox
        }
    else
        {
        var share='';
        var modAlt=e.altKey;
        var modShift=e.shiftKey;
        var modCtrl=e.ctrlKey;
        var modMeta=e.metaKey;
        var modOn=(modAlt || modShift || modCtrl || modMeta);
        
         switch (e.which) 
         {
			 
		                // left arrow
            case 37: if ((jQuery('.prevLink').length > 0)) {jQuery('.prevLink').click();break;}
              if ((jQuery('.prevPageLink').length > 0)) jQuery('.prevPageLink').click();
              
                                          break;
            // right arrow
            case 39: if ((jQuery('.nextLink').length > 0)) {jQuery('.nextLink').click();break;}
              if ((jQuery('.nextPageLink').length > 0)) jQuery('.nextPageLink').click();
                                          break;   
            case 65: if (jQuery('.addToCollection').length > 0) jQuery('.addToCollection:not(.ResourcePanelIcons .addToCollection)').click();
                     break;
            case 82: if (jQuery('.removeFromCollection').length > 0) jQuery('.removeFromCollection:not(.CollectionSpace .removeFromCollection)').click();
                     break;  
            case 188: if (jQuery('.prevLink').length > 0) jQuery('.prevLink').click();
                     break;
            case 190: if (jQuery('.nextLink').length > 0) jQuery('.nextLink').click();
                     break;
            case 191: if (jQuery('.upLink').length > 0) jQuery('.upLink').click();
                     break;
            case 84: if (jQuery('#toggleThumbsLink').length > 0) jQuery('#toggleThumbsLink').click();
                     break;
            case 90: if (jQuery('.enterLink').length > 0) window.location=jQuery('.enterLink').attr("href");
                     break;
            case 27: ModalClose();
                     break;
            case 86: CentralSpaceLoad('https://photo.city.edogawa.tokyo.jp/pages/search.php?search=!collection'+document.getElementById("currentusercollection").innerHTML+'&k='+share,true);
                     break;
                     }
         
     }
 });
});
</script>
    <!-- GoogleAnalytics(GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-7BE2K1V4WX"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-7BE2K1V4WX', { 'debug_mode': true });
    </script>
    <!-- 簡単ログ解析 -->
    <script type="text/javascript" ><!--
    var rakulog_id ="oNpjNm0rt5zU9PAp";
    rakulog_outbound=true;
    rakulog_download=true;
    rakulog_downloadList = ["pdf","zip","xls"];
    (function() {
    var rakulog  = document.createElement('script'); rakulog.type = 'text/javascript'; rakulog.async = true;
    rakulog.src =   location.protocol + '//kantan-log.jp/kantanlog_async.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(rakulog, s);
    })();
    //--></script>
    <noscript>
    <p><img src="https://kantan-log.jp/_analysis.rakulog?uid=oNpjNm0rt5zU9PAp&amp;key=noscript&amp;ctime=&amp;ltime=&amp;ftime=&amp;count=auto&amp;sorder=auto&amp;interval=auto" width="1" height="1" alt="" ></p>
    </noscript>
        <script src="https://photo.city.edogawa.tokyo.jp/plugins/dwcomponents/lib/semantic-ui-2.3/semantic.min.js" type="text/javascript"></script>
    <script src="https://photo.city.edogawa.tokyo.jp/plugins/dwcomponents/lib/jquery.exresize/jquery.exresize.min.js" type="text/javascript"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/gsap/latest/TweenMax.min.js"></script>
        <!-- Sortablejs -->
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/sortablejs-1.7.0/Sortable.min.js"></script>

    <!--jquery-file-upload-->
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/load-image.all.min.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.fileupload.min.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.fileupload-jquery-ui.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.iframe-transport.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.fileupload-process.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.fileupload-image.js"></script>
    <script type="text/javascript" src="https://photo.city.edogawa.tokyo.jp/plugins/dwcontribute/lib/jQuery-File-Upload/js/jquery.fileupload-validate.js"></script>
    <script src="/lib/lightbox/js/lightbox.min.js" type="text/javascript" ></script><link type="text/css" href="/lib/lightbox/css/lightbox.min.css?css_reload_key=8.6.12117" rel="stylesheet" />	<script>
	function closeModalOnLightBoxEnable()
		{
		setTimeout(function() {
			if(jQuery('#lightbox').is(':visible'))
				{
				ModalClose();
				}
		}, 10);
		}

	jQuery(document).ready(function()
        {
        lightbox.option({
			'resizeDuration': 300,
			'imageFadeDuration': 300,
			'fadeDuration': 300,
			'alwaysShowNavOnTouchDevices': true})
        });
	</script>
	

<!-- Structure Stylesheet -->
<link href="https://photo.city.edogawa.tokyo.jp/css/global.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" />
<!-- Colour stylesheet -->
<link href="https://photo.city.edogawa.tokyo.jp/css/colour.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" />
<!-- Override stylesheet -->
<link href="https://photo.city.edogawa.tokyo.jp/css/css_override.php?k=&css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" />
<!--- FontAwesome for icons-->
<link rel="stylesheet" href="https://photo.city.edogawa.tokyo.jp/lib/fontawesome/css/font-awesome.min.css">
<!-- Load specified font CSS -->
<link id="global_font_link" href="https://photo.city.edogawa.tokyo.jp/css/fonts/WorkSans.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" />

<!--[if lte IE 7]> <link href="https://photo.city.edogawa.tokyo.jp/css/globalIE.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css"  media="screen,projection,print" /> <![endif]--><!--[if lte IE 5.6]> <link href="https://photo.city.edogawa.tokyo.jp/css/globalIE5.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css"  media="screen,projection,print" /> <![endif]-->

<link href="/plugins/edogawa/css/style.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" class="plugincss" />
		<link href="/plugins/dwnotice/css/style.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" class="plugincss" />
		<link href="/plugins/dwcontribute/css/style.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" class="plugincss" />
		<link href="/plugins/dwcomponents/css/dwcomponents.min.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css"><link href="/plugins/dwphototheme/css/style.css?css_reload_key=8.6.12117" rel="stylesheet" type="text/css" media="screen,projection,print" class="plugincss" />
		<script>jQuery('.plugincss').attr('class','plugincss0');</script>
</head>
<body lang="ja" class="" >

<!-- Loading graphic -->
	<div id="LoadingBox"><i aria-hidden="true" class="fa fa-circle-o-notch fa-spin fa-3x fa-fw"></i></div>
	


<!--Global Header-->
<div id="UICenter" class="ui-layout-center">

<div id="Header" class=" HeaderMid ug-9">

    <div id="HeaderResponsive">
    			<a href="https://photo.city.edogawa.tokyo.jp/pages/home.php" onClick="return CentralSpaceLoad(this,true);" class="HeaderImgLink"><img src="https://photo.city.edogawa.tokyo.jp/filestore/system/config/linkedheaderimgsrc.png" id="HeaderImg" alt="サイトロゴ"></a>
			        <div id="HeaderButtons" style="display:none;">
            <a href="#" id="HeaderNav2Click" class="ResponsiveHeaderButton ResourcePanel ResponsiveButton">
                <span class="rbText">メニュー</span>
                <span class="fa fa-fw fa-lg fa-bars"></span>
            </a>
        </div>
            </div>
    	<div id="HeaderNav1" class="HorizontalNav">

<script>

 	var activeSeconds=30;

	var message_timer = null;
	var message_refs = new Array();
	var message_poll_first_run = true;

	function message_poll()
	{
		if (message_timer != null)
		{
			clearTimeout(message_timer);
			message_timer = null;
		}
		activeSeconds-=10;
		if(activeSeconds < 0)
			{
				message_timer = window.setTimeout(message_poll,10 * 1000);
				return;
			}
					jQuery.ajax({
			url: 'https://photo.city.edogawa.tokyo.jp/pages/ajax/message.php',
			type: 'GET',
			success: function(messages, textStatus, xhr) {
				if(xhr.status==200 && isJson(messages) && (messages=jQuery.parseJSON(messages)) && jQuery(messages).length>0)
					{
					messagecount=totalcount=jQuery(messages).length;
					actioncount=0;
					if (typeof(messages[messagecount-1]['actioncount']) !== 'undefined') // There are actions as well as messages
						{
						actioncount=parseInt(messages[messagecount-1]['actioncount']);
						messagecount=messagecount-1;
						totalcount=actioncount+messagecount;
						}
					jQuery('span.MessageTotalCountPill').html(totalcount).fadeIn();
					if (activeSeconds > 0 || message_poll_first_run)
						{
						for(var i=0; i < messagecount; i++)
							{
							var ref = messages[i]['ref'];
							if (message_poll_first_run)
							{
								message_refs.push(ref);
								continue;
							}
							if (message_refs.indexOf(ref)!=-1)
							{
								continue;
							}
							message_refs.push(ref);
							var message = nl2br(messages[i]['message']);
							var url = messages[i]['url'];
															message_display(message, url, ref, function (ref) {
									jQuery.get('https://photo.city.edogawa.tokyo.jp/pages/ajax/message.php?seen=' + ref).done(function () {
									});
								});
																message_poll();
							}
						}
					if (actioncount>0)
							{
							jQuery('span.ActionCountPill').html(actioncount).fadeIn();;
							}
						else
							{
							jQuery('span.ActionCountPill').hide();	
							}
						if (messagecount>0)
							{
							jQuery('span.MessageCountPill').html(messagecount).fadeIn();;
							}
						else
							{
							jQuery('span.MessageCountPill').hide();	
							}
					}
				else
					{
					jQuery('span.MessageTotalCountPill').hide();
					jQuery('span.MessageCountPill').hide();
					jQuery('span.ActionCountPill').hide();
					}
			}
		}).done(function() {
			message_timer = window.setTimeout(message_poll,10 * 1000);
							message_poll_first_run = false;
		});
	}

	jQuery(document).bind("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error",
		function() {
			activeSeconds=30;
		});

	jQuery(document).ready(function () {
			message_poll();
		});

	function message_display(message, url, ref, callback)
	{
		if (typeof ref==="undefined")
		{
			ref=new Date().getTime();
		}
		if (typeof url==="undefined")
		{
			url="";
		}
		if (url!="")
		{
			url=decodeURIComponent(url);
			url="<a href='" + url + "'>リンク</a>";
		}
		var id='message' + ref;
		if (jQuery("#" + id).length)		// already being displayed
		{
			return;
		}
		jQuery('div#MessageContainer').append("<div class='MessageBox' style='display: none;' id='" + id + "'>" + nl2br(message) + "<br />" + url + "</div>").after(function()
		{
			var t = window.setTimeout(function()
			{
				jQuery("div#" + id).fadeOut("fast",function()
					{
						this.remove()
					}
				)
			},5000);

			jQuery("div#" + id).show().bind("click",function()
			{
				jQuery("div#" + id).fadeOut("fast", function()
				{
					jQuery("div#" + id).remove();
					jQuery.get('https://photo.city.edogawa.tokyo.jp/pages/ajax/message.php?seen=' + ref);
					if (typeof callback === 'function')
					{
						callback();
					}
				});
			});

			jQuery("div#" + id).bind("mouseenter",function()
			{
				window.clearTimeout(t);
				jQuery("div#" + id).fadeIn("fast");
			});

			jQuery("div#" + id).bind("mouseleave",function()
			{
				window.clearTimeout(t);
				t = window.setTimeout(function()
				{
					jQuery("div#" + id).fadeOut("fast",function()
						{
							this.remove();
						}
					)},3000);
			});
		});
	}
	
	function message_modal(message, url, ref, owner)
		{
		if (typeof ref==="undefined")
			{
				ref=new Date().getTime();
			}
		if (typeof url==="undefined")
			{
				url="";
			}
		if (url!="")
			{
				url=decodeURIComponent(url);
				url="<a href='" + url + "'>リンク</a>";
			}
		if (typeof owner==="undefined" || owner=='')
			{
			owner = '江戸川画像文庫';
			}
		jQuery("#modal_dialog").html("<div class='MessageText'>" + nl2br(message) + "</div><br />" + url);
		jQuery("#modal_dialog").addClass('message_dialog');
		jQuery("#modal_dialog").dialog({
			title: 'メッセージ from ' + owner,
			modal: true,
			resizable: false,
			buttons: [{text: 'OK',
					  click: function() {
						jQuery( this ).dialog( "close" );
						}}],
			dialogClass: 'message',
			width:'auto',
			draggable: true,
			open: function(event, ui) { jQuery('.ui-widget-overlay').bind('click', function(){ jQuery("#modal_dialog").dialog('close'); }); },
			close: function( event, ui ) {
				jQuery('#modal_dialog').html('');
				jQuery("#modal_dialog").removeClass('message_dialog');
				jQuery.get('https://photo.city.edogawa.tokyo.jp/pages/ajax/message.php?seen=' + ref);
				},
			dialogClass: 'no-close'
			});
			 
		}

</script>
</div>
<div id="HeaderNav2" class="HorizontalNav HorizontalWhiteNav">
				<ul id = "HeaderLinksContainer">
		    		<li class="HeaderLink"><a href="https://photo.city.edogawa.tokyo.jp/pages/search_advanced.php"  onClick="return CentralSpaceLoad(this,true);">詳細検索</a></li>				    <li class="HeaderLink">
      <a href="https://photo.city.edogawa.tokyo.jp/pages/themes.php?themes_order_by=created" onClick="return CentralSpaceLoad(this,true);">テーマ</a>
    </li>
																								
        		
		
						
    <li>
      <a onclick="return CentralSpaceLoad(this,true);" href="https://photo.city.edogawa.tokyo.jp/plugins/edogawa/pages/newest_collections.php">新着</a>
    </li>
    <li>
      <a onclick="return CentralSpaceLoad(this,true);" href="https://photo.city.edogawa.tokyo.jp/plugins/edogawa/pages/help.php">オンラインヘルプ</a>
    </li>
			</ul>
<script>
headerLinksDropdown();
</script>
		
</div>




<div class="clearer"></div></div>
        <div id="SearchBarContainer">
        <div id="SearchBox" >


<div id="SearchBoxPanel">



<div class="SearchSpace" >


  <h2>簡単検索</h2>
	<p><label for="ssearchbox">説明文、キーワード、リソースIDを使って検索してください。<br><br>複数指定する場合は半角スペースで区切ってください。</label></p>
	<form id="simple_search_form" method="post" action="https://photo.city.edogawa.tokyo.jp/pages/search.php" onSubmit="return CentralSpacePost(this,true);">
        <input type="hidden" name="CSRFToken" value="ZTMzZWUyOWU4OWJmMWVmZDM2YjU3ZjBmZTJmYWIzYWVjNGUyNzRiMmQ2N2RhNTY3M2Q2NmUxODdlMGVjMjM2OUBAwbbM/4XX51vj+hhz4siyNPYYvN/rumflR4SB4Wp9PcwUQkansxkotk87tUJZ6+hGCfeiV04tJGkucRyuBXTFUxSnOqbo5pEjSMZZfw2lIH0od1JpZ/60mZ7CAc2oNic5KG8+5iVkLVLfxkvIvHD2A7MNwGenqArSGCROx1GQzu8DaeJ4Ux/fWRL0IM1lUjznQAUquQAPdJMznZEVZEeo2kqc3bRSFtysZ4cMqZp7MEBA4mWYKj3RPcMaicZLN35PaD0LiJVs1H2BnPBzKXiqjRU=">
            <input id="ssearchbox"  name="search" type="text" class="SearchWidth" value="">
        <script>
                    jQuery(document).ready(function () {
                jQuery('#ssearchbox').autocomplete({source: "https://photo.city.edogawa.tokyo.jp/pages/ajax/autocomplete_search.php"});
            });
                    </script>
        	<input type="hidden" name="restypes" id="restypes" value="1,2" />
	




	    <script type="text/javascript">
    function ClearInputAndCookie() {
        document.getElementById('ssearchbox').value='';
        if (navigator.cookieEnabled) {
            document.cookie="search=;path=/";
        }
    }
    </script>

	<div class="SearchItem" id="simplesearchbuttons"><input name="Clear" id="clearbutton" class="searchbutton" type="button" value="&nbsp;&nbsp;クリアー&nbsp;&nbsp;" onClick="ClearInputAndCookie();"/><input name="Submit" id="searchbutton" class="searchbutton" type="submit" value="&nbsp;&nbsp;検索&nbsp;&nbsp;" /><input type="button" id="Rssearchexpand" class="searchbutton" style="display:none;" value="もっと見る"></div>

  </form>
  <br />
      <p><i aria-hidden="true" class="fa fa-fw fa-search-plus"></i>&nbsp;<a onClick="return CentralSpaceLoad(this,true);" href="https://photo.city.edogawa.tokyo.jp/pages/search_advanced.php">詳細検索へ</a></p>
  
  
	 <!-- END of Searchbarreplace hook -->
	</div>
	 <!-- END of Searchbarremove hook -->
	</div>


	
	


</div>
        </div>
        
<!--Main Part of the page-->
        <div id="CentralSpaceContainer"><main role="main" id="CentralSpace">


    <script type="text/javascript">
        var tonoheaderadd = [{charindex:8, page: 'home.php'}];
        var fromnoheaderadd = [{charindex:8, page: 'home.php'}];
    </script>
    <script>

linkreload = true;
jQuery(document).ready(function()
    {
    ActivateHeaderLink("https:\/\/photo.city.edogawa.tokyo.jp%2Fpages%2Fdownload_progress.php%3Fref%3D1266");

    jQuery(document).mouseup(function(e)
        {
        var linksContainer = jQuery("#DropdownCaret");
        if (linksContainer.has(e.target).length === 0 && !linksContainer.is(e.target))
            {
            jQuery('#OverFlowLinks').fadeOut();
            }
        });
    });

window.onresize=function()
    {
    ReloadLinks();
    }
</script>
	<script type="text/javascript">
        window.setTimeout("document.location='https://photo.city.edogawa.tokyo.jp/pages/download.php?ref=1266&size=&ext=jpg&k=&alternative=-1&usage=-1&usagecomment='",1000);
	</script>
	
<div class="BasicsBox">


		<!--<h2>&nbsp;</h2>-->
    <h1>ダウンロード中</h1>
    <p>ダウンロードはまもなく開始します。 続けて作業する場合は以下のリンクを使用してください。</p>
		    <p><a onClick="return CentralSpaceLoad(this,true);" href="/pages/view.php?ref=1266&k=&search=&offset=&order_by=&sort=&archive="><i aria-hidden="true" class="fa fa-caret-left"></i>&nbsp;リソース表示へ戻る</a></p>
    <p><a onClick="return CentralSpaceLoad(this,true);" href="/pages/search.php?ref=1266&k=&search=&offset=&order_by=&sort=&archive="><i aria-hidden="true" class="fa fa-caret-left"></i>&nbsp;戻る</a></p>

        <p><a onClick="return CentralSpaceLoad(this,true);" href="/pages/home.php?"><i aria-hidden="true" class="fa fa-caret-left"></i>&nbsp;ホームへ戻る</a></p>
	    
</div>

<div class="clearer"></div>

<!-- Use aria-live assertive for high priority changes in the content: -->
<span role="status" aria-live="assertive" class="ui-helper-hidden-accessible"></span>

<!-- Global Trash Bin -->
<div id="trash_bin">
	<span class="trash_bin_text">削除</span>
</div>
<div id="trash_bin_delete_dialog" style="display: none;"></div>

<div class="clearerleft"></div>
</main><!--End div-CentralSpace-->
</div><!--End div-CentralSpaceContainer-->

<div class="clearer"></div>


<!--Global Footer-->
<div id="Footer">
    <div class="ResponsiveViewFullSite">
        <a href="#" onClick="SetCookie('ui_view_full_site', true, 1, true); location.reload();"></a>
    </div>
    	<div id="FooterNavLeft" class="">
	<span id="FooterLanguages">
		</span>
	</div>
	    <script src="https://photo.city.edogawa.tokyo.jp/plugins/dwphototheme/lib/common.js" type="text/javascript"></script>
    <div id="back-top">
      <div><span></span></div>
    </div>

    <div class="clearer"></div>
</div>



<div class="footer-container1">
  <div class="footer footer-links">
    <div class="ui stackable grid footer-column-wrapper">

      <div class="six wide column footer-column footer-column-1">
        <div class="footer-contact-wrapper">
            <div class="footer-contact1">
              <span>江戸川区 広報課</span>
            </div>
            <div class="footer-contact2">
              <div>電話：03-5662-6168</div>
              <div>FAX：03-3652-1109</div>
              <div>E-mail：webmaster(at)city.edogawa.tokyo.jp<br>※(at)を@に替えてご使用ください。</div>
            </div>
        </div>
      </div>

      <div class="four wide column footer-column footer-column-2">
        <div class="footer-ul-wrapper">
            <div class="footer-ul-header">江戸川区公式サイト</div>
            <ul class="footer-ul">
              <li><a class="externallink" href="https://www.city.edogawa.tokyo.jp/index.html" target="_blank" rel="noreferrer">江戸川区ホームページ </a></li>
              <li><a class="externallink" href="https://www.city.edogawa.tokyo.jp/aboutweb/privacypolicy.html" target="_blank" rel="noreferrer">プライバシーポリシー </a></li>
              <li><a class="externallink" href="https://www.city.edogawa.tokyo.jp/e004/kuseijoho/kohokocho/goiken/otoiawase/index.html" target="_blank" rel="noreferrer">お問い合わせ </a></li>
            </ul>
        </div>
      </div>

      <div class="six wide column footer-column footer-column-3">
        <div class="footer-ul-wrapper">
            <div class="footer-ul-header">規約等</div>
            <ul class="footer-ul">
                <li><a href="/plugins/edogawa/pages/opendatapolicy.php">オープンデータ利用規約</a></li><!--
             --><li><a href="/plugins/edogawa/pages/contributepolicy.php">データ投稿に関する利用規約</a></li><!--
             --><li><a href="/plugins/edogawa/pages/guideline.php">写真著作物の貸出しに関するガイドライン</a></li><!--
             --><li><a href="/plugins/edogawa/pages/accesspolicy.php">江戸川画像文庫へのアクセスについて</a></li>
            </ul>
        </div>
      </div>

    </div>

  </div>
</div>


<div class="footer-container2">
  <div class="footer footer-copy">
    <div>
    ©2018 Edogawa city
    </div>
  </div>
</div>




    

<script language='javascript'>
document.title = "江戸川画像文庫";
</script><script src="https://photo.city.edogawa.tokyo.jp/lib/js/Placeholders.min.js?css_reload_key=8.6.12117" type="text/javascript"></script>

<!--CollectionDiv--></div>

		<script>
			usercollection='1205';
		var collections_popout = false;
			</script>			<div class="ui-layout-south" ></div><script>myLayout=jQuery('body').layout({south__initHidden: true });	</script>		<!-- Responsive -->
		<script src="/lib/js/responsive.js?css_reload_key=8.6.12117"></script>
		<script>
		function toggleSimpleSearch()
			{
			if(jQuery("#searchspace").hasClass("ResponsiveSimpleSearch"))
				{
				jQuery("#searchspace").removeClass("ResponsiveSimpleSearch");
				jQuery("#Rssearchexpand").val("もっと見る");
				}
			else
				{
				jQuery("#searchspace").addClass("ResponsiveSimpleSearch");
				jQuery("#Rssearchexpand").val(" もっと少なく ");
				}
			}

		function toggleResultOptions()
			{
			jQuery("#CentralSpace .TopInpageNavLeft .InpageNavLeftBlock").slideToggle(100);
			jQuery("#ResponsiveResultCount").toggle();
			jQuery("#SearchResultFound").hide();
			jQuery("#CentralSpace .TopInpageNavLeft .InpageNavLeftBlock.icondisplay").css('display', 'inline-block');
			}

		/* Responsive Stylesheet inclusion based upon viewing device */
		if(document.createStyleSheet)
			{
			document.createStyleSheet('https://photo.city.edogawa.tokyo.jp/css/responsive/slim-style.css?rcsskey=8.6.12117');
			}
		else
			{
			jQuery("head").append("<link rel='stylesheet' href='https://photo.city.edogawa.tokyo.jp/css/responsive/slim-style.css?rcsskey=8.6.12117' type='text/css' media='screen' />");
			}

		if(!is_touch_device() && jQuery(window).width() <= 1280)
			{
			if(document.createStyleSheet)
				{
				document.createStyleSheet('https://photo.city.edogawa.tokyo.jp/css/responsive/slim-non-touch.css?rcsskey=8.6.12117');
				}
			else
				{
				jQuery("head").append("<link rel='stylesheet' href='https://photo.city.edogawa.tokyo.jp/css/responsive/slim-non-touch.css?rcsskey=8.6.12117' type='text/css' media='screen' />");
				}
			}

		var responsive_show = "隠す";
		var responsive_hide;
		var responsive_newpage = true;

		if(jQuery(window).width() <= 1200)
			{
			jQuery('.ResponsiveViewFullSite').css('display', 'block');
			}
		else
			{
			jQuery('.ResponsiveViewFullSite').css('display', 'none');
			}

		if(jQuery(window).width()<=700)
			{
			touchScroll("UICenter");
			}

		jQuery(window).resize(function()
			{
			hideMyCollectionsCols();
			responsiveCollectionBar();
			});
		if(jQuery(window).width()<=900)
			{
			jQuery('#CollectionDiv').hide(0);
			}
		jQuery("#HeaderNav1Click").click(function(event)
			{
			event.preventDefault();
			if(jQuery(this).hasClass("RSelectedButton"))
				{
				jQuery(this).removeClass("RSelectedButton");
				jQuery("#HeaderNav1").slideUp(0);
				jQuery("#Header").removeClass("HeaderMenu");
				}
			else
				{
				jQuery("#HeaderNav2Click").removeClass("RSelectedButton");
				jQuery("#HeaderNav2").slideUp(80);
				jQuery("#Header").addClass("HeaderMenu");
				jQuery(this).addClass("RSelectedButton");
				jQuery("#HeaderNav1").slideDown(80);
				}
			if(jQuery("#searchspace").hasClass("ResponsiveSimpleSearch"))
				{
				toggleSimpleSearch();
				}
			});

		jQuery("#HeaderNav2Click").click(function(event)
			{
			event.preventDefault();
			if(jQuery(this).hasClass("RSelectedButton"))
				{
				jQuery(this).removeClass("RSelectedButton");
				jQuery("#HeaderNav2").slideUp(0);
				jQuery("#Header").removeClass("HeaderMenu");

				}
			else
				{
				jQuery("#Header").addClass("HeaderMenu");
				jQuery("#HeaderNav1Click").removeClass("RSelectedButton");
				jQuery("#HeaderNav1").slideUp(80);
				jQuery(this).addClass("RSelectedButton");
				jQuery("#HeaderNav2").slideDown(80);
				}
			if(jQuery("#searchspace").hasClass("ResponsiveSimpleSearch"))
				{
				toggleSimpleSearch();
				}
			});

		jQuery("#HeaderNav2").on("click","a",function()
			{
			if(jQuery(window).width() <= 1200)
				{
				jQuery("#HeaderNav2").slideUp(0);
				jQuery("#HeaderNav2Click").removeClass("RSelectedButton");
				}
			});
		jQuery("#HeaderNav1").on("click","a",function()
			{
			if(jQuery(window).width() <= 1200)
				{
				jQuery("#HeaderNav1").slideUp(00);
				jQuery("#HeaderNav1Click").removeClass("RSelectedButton");
				}
			});
		jQuery("#SearchBarContainer").on("click","#Rssearchexpand",toggleSimpleSearch);
		jQuery("#SearchBarContainer").on("click","a",toggleSimpleSearch);
		jQuery("#CentralSpaceContainer").on("click","#Responsive_ResultDisplayOptions",function(event)
			{
			if(jQuery(this).hasClass("RSelectedButton"))
				{
				jQuery(this).removeClass("RSelectedButton");
				}
			else
				{
				jQuery(this).addClass("RSelectedButton");
				}
			toggleResultOptions();
			});

		if(jQuery(window).width() <= 700 && jQuery(".ListviewStyle").length && is_touch_device())
			{
			jQuery("td:last-child,th:last-child").hide();
			}
		</script>
		<!-- end of Responsive -->
			<!-- Start of modal support -->
	<div id="modal_overlay" onClick="ModalClose();"></div>
	<div id="modal_outer">
	<div id="modal">
	</div>
	</div>
	<div id="modal_dialog" style="display:none;"></div>
	<script type="text/javascript">
	jQuery(window).bind('resize.modal', ModalCentre);
	</script>
	<!-- End of modal support -->

	<script>

	try
		{
		top.history.replaceState(document.title+'&&&'+jQuery('#CentralSpace').html(), applicationname);
		}
	catch(e){console.log(e);
	//console.log("failed to load state");
	}

	</script>

		</body>
	</html>

