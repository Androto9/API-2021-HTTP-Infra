$(function() {
    console.log("Loading Zoo");

    function loadZoo() {
        $.getJSON( "/zoo/animals/zoo/animals", function( animals ) {
            console.log(animals);
            var message = "No animals here";
            if( animals.length > 0 ) {
                message = animals[0].animal;
            }
            $(".btn.btn-primary").text(message);
        });
    };

    loadZoo();
    setInterval( loadZoo, 2000 );
});
