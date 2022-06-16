
$(document).ready(function () {
    initAccordion();
});


function initAccordion() {
    var acc = $(".accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
            /* Toggle between adding and removing the "active" class,
            to highlight the button that controls the panel */
            this.classList.toggle("active");

            /* Toggle between hiding and showing the active panel */
            var panel = this.nextElementSibling;
            if (panel.style.display === "block") {
                panel.style.display = "none";
                const $chevron = $(this).find("i");
                $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
            } else {
                panel.style.display = "block";
                const $chevron = $(this).find("i");
                $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
            }
        });
    }
}
