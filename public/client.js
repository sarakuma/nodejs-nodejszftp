// client-side js
// run by the browser each time your view template is loaded

var form = document.querySelector("#zftp-form")

window.onload = (event) => {

    let article3 = form.querySelectorAll("article")[2]
    article3.style.paddingBottom = "0px"

    return
}

var machineSel = document.querySelector("#machine-sel")

machineSel.onchange = () => {
    //function to change the placeholder text of hostname related text field based on the user's selection

    let machineInput = document.querySelector("input[name='machine-input']")

    let selectValue = machineSel.value
    console.log(selectValue)

    if (selectValue == "hostname") {
        machineInput.placeholder = "enter your hostname"
    } else {
        machineInput.placeholder = "enter your ip address"
    }

    return
}

var buttonPlus = document.querySelector("button[name='btnp']")
var buttonMinus = document.querySelector("button[name='btnm']")

buttonPlus.onclick = () => {

    //function to add the DOM elements when + button is clicked
    let form = document.querySelector("#zftp-form")
    let childcnt = form.children.length
    let curchild = childcnt - 2

    if (childcnt < 13) {
        let article = document.createElement("article")

        article.className = "article-container"

        article.innerHTML = `
        <input type="hidden" name="trsfrno${curchild}" value=${curchild}>
        <span>FT#</span>
        <span>${curchild}</span>
        <fieldset>
            <legend>Verb?</legend>
            <div>
                <input type="radio" name="ftpverb-radio${curchild}" value="receive" checked>
                <label for="ftpverb-radio${curchild}">Recieve data from mainframe</label>
            </div>
            <div>
                <input type="radio" name="ftpverb-radio${curchild}" value="send">
                <label for="ftpverb-radio${curchild}">Send data to mainframe</label>
            </div>
        </fieldset>
        <fieldset>
             <legend>Format?</legend>
             <div>
                 <input type="radio" name="ftpformat-radio${curchild}" value="text" checked>
                 <label for="ftpformat-radio${curchild}">Text</label>
             </div>
             <div>
                 <input type="radio" name="ftpformat-radio${curchild}" value="binary">
                 <label for="ftpformat-radio${curchild}">Binary</label>
             </div>
        </fieldset>
        <fieldset>
            <legend>Files?</legend>
           <div>
                <input type=text name="dsn${curchild}" maxlength=44 placeholder="Mainframe dataset name" title="Please enter DSN without quotes" required>
                <input type=number name="lrecl${curchild}" min=1 max=9999 placeholder="LRECL" required>
            </div>
            <div>
                <input type=text class="inpfil" name="filename${curchild}" placeholder="Client file name" title="Please specify the absolute path of the file" required>
            </div>
        </fieldset>
        `

        form.appendChild(article)
        buttonMinus.disabled = false
        buttonMinus.style.cursor = "pointer"
    } else {
        buttonPlus.disabled = true
        buttonPlus.style.cursor = "default"
    }

    return

}

buttonPlus.onmouseover = changeBtnpcursor


//function to disable/enable the + button when the max limit is reached
var changeBtnpcursor = () => {

    let childcnt = document.querySelector("#zftp-form").children.length

    if (childcnt < 13) {
        buttonPlus.disabled = false
        buttonPlus.style.cursor = "pointer"
    } else {
        buttonPlus.disabled = true
        buttonPlus.style.cursor = "default"
    }

    return

}

buttonMinus.onclick = () => {

    //function to remove the DOM elements when - button is clicked

    let form = document.querySelector("#zftp-form")
    form.removeChild(form.lastChild)

    changeBtnmcursor()

    if (buttonPlus.disabled) {
        buttonPlus.disabled = false
        buttonPlus.style.cursor = "pointer"
    }

    return

}

buttonMinus.onmouseover = changeBtnmcursor

//changeBtnmcursor function to disable/enable the - button when the max limit is reached
var changeBtnmcursor = () => {

    let childcnt = document.querySelector("#zftp-form").children.length

    if (childcnt > 4) {
        buttonMinus.disabled = false
        buttonMinus.style.cursor = "pointer"
    } else {
        buttonMinus.disabled = true
        buttonMinus.style.cursor = "default"
    }

    return

}
