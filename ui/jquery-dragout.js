/**
 * Download a file by dragging it out of the browser.
 * Currently only supported by google chrome browser
 * @example
 *  <a class="dragout"
 *     data-downloadurl="application/pdf:saleking-invoice.pdf:http://salesking.eu"
 *     href="http://some-url.de"
 *  salesking-invoice.pdf</a>
 *
 *  $('.downdrag').dragout();
 *
 * The important part:
 * data-downloadurl="application/pdf:saleking-invoice.pdf:http://salesking.eu"
 * data-downloadurl="mime-type:filename:file-url"
 */
(function($) {
    $.fn.extend({

      dragout : function () {
        var files = this;
        if(files.length > 0) {
          var use_data = (typeof files[0].dataset === "undefined") ? false : true;
          $(files).each(function() {
            var url = use_data ? this.dataset.downloadurl : this.getAttribute("data-downloadurl");
            this.addEventListener("dragstart",function(e){
              e.dataTransfer.setData("DownloadURL",url);
            },false);
          });
        }
      }
});
})(jQuery);
