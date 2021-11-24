// REST Logic
const enviroment = require('dotenv').config()
const express = require('express')
const app = express()
// Express settings
const session = require('express-session')
const cookieParser = require('cookie-parser')
app.use(session({
    secret : process.env.SECRET,
    cookie : {secure : true},
    resave : true,
    saveUninitialized : true
}))
app.set("view engine", "ejs");
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended : false}))


const http = require('http').createServer(app)
const axios = require('axios')
const FormData = require('form-data');
const port = 2021
http.listen(port, ()=>{
    console.log(`Listening on *:${port}`);
});
let isLoggedIn = require('./middleware/isLoggedIn.js');

app.post("/login", async(req,res)=>{
    // const data = req.body   
    const data = {api : "login", info :{email : req.body.email, password : req.body.password}, headers : ""}
    const token = await apiPostRequest(data)
    if(token !== null && token.token){
        res.cookie('bearer', token.token)
        res.render('../views/index.ejs', {loggedIn : true})
    }else{
        console.error('Encountered and error', token.status)
        res.render('../views/index.ejs', {loggedIn : false, error : token.status})
    }
})
app.post("/logout", isLoggedIn, async (req,res)=>{
    if(req.cookies && req.cookies.bearer){
        // const auth = req.cookies.bearer
        // const headers = {headers : {
        //     'Authorization' : `Bearer ${auth}`
        // }}
        const headers = generateHeaders(req.cookies)
        let logOut = await apiPostRequest({api : 'logout', info : "", headers : headers })
        if(logOut.status === 204){
            console.log('Logged out')
            res.clearCookie('bearer')
        }else{
            console.log('Something went wrong with logging out')
        }
        res.redirect("/")
    }
})
app.post('/updateProfile', isLoggedIn, async (req,res)=>{
    const data = validateProfileData(req.body)
    if(req.cookies && req.cookies.bearer && data){
        const headers = generateHeaders(req.cookies)
        let putData = {api : 'profile', info : data, headers: headers}
        let updateProfile = await apiPutRequest(putData)
        if(updateProfile.status !== 200){
            console.log('Something went wrong:', updateProfile.status)
        }
    }else{
        console.log('Invalid Request')
    }
})
app.post('/newProduct', isLoggedIn, async (req,res)=>{
    if(req.cookies && req.cookies.bearer){
        const data = {name : req.body.name, description : req.body.description, price : req.body.price, stock_id : req.body.stock_id}
        const headers = generateHeaders(req.cookies)
        let addProduct = await apiPostRequest({api : 'products/', info : data, headers : headers })
        if(addProduct.status === 200){
            console.log('Added Product')
            // res.clearCookie('bearer')
        }else{
            console.log('Something went wrong with Product Creation:', addProduct.status)
        }
        res.redirect("/products")
    }
})

app.get('/profile', isLoggedIn, async (req,res)=>{
    let profile = await apiGetRequest({api : 'profile', cookies : req.cookies})
    res.render('../views/profile', {profile : profile, loggedIn : true})
})
app.get('/products', isLoggedIn, async (req,res)=>{
    let products = await apiGetRequest({api : 'products', cookies : req.cookies})
    res.render('../views/products', {products : products, loggedIn : true})
})
app.get('/stocks', isLoggedIn, async (req,res)=>{
    let stocks = await apiGetRequest({api : 'stocks', cookies : req.cookies})
    console.log(stocks)
    // res.render('../views/products', {products : products})
})
app.get("/", async(req,res)=>{
    if(req.cookies && req.cookies.bearer){
        res.render('../views/index.ejs', {loggedIn : true})
    }else{
        res.render('../views/index.ejs', {loggedIn : false})
    }
})
const emailCheck = (email)=>{
    // Regex that checks if it does not contain a number, lowercase, uppercase, or symbol.
    const regex = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?")
    if (regex.test(email)) {
        return true
    }
    return false
}
const passwordCheck = (password) => {
    // Regex that checks if it does not contain a number, lowercase, uppercase, or symbol. FALSE = good.
    const regex = new RegExp('^(.{0,7}|[^0-9]*|[^A-Z]*|[^a-z]*|[a-zA-Z0-9]*)$')
    if (!regex.test(password)) {
        return true
    }
    return false
}
const validateProfileData = (data) =>{
    // Alternative function name: Typescript seems like fun
    let validatedData = {}
    if(data.name && typeof data.name === 'string'){
        validatedData.name = data.name
    }else{
        return false
    }
    if(data.email && emailCheck(data.email)){
        validatedData.email = data.email
    }else{
        return false
    }
    if(data.password && passwordCheck(data.password)){
        validatedData.password = data.password
    }else{
        return false
    }
    if(data.password && data.password_confirmation && (data.password === data.password_confirmation)){
        validatedData.password_confirmation = data.password_confirmation
    }else {
        return false
    }
    return validatedData
}

const generateHeaders = (info) =>{
    const auth = info.bearer
    const cookie = `XSRF-TOKEN=${info.bearer}`
    const headers = {headers : {
        'Authorization' : `Bearer ${auth}`,
        'Cookie' : `${cookie}`
    }}
    return headers
}
async function apiPostRequest(data) {
    let res = await axios.post(`https://assessment.farm21.com/api/${data.api}`, data.info, data.headers).catch((response)=>{
        return response.response
    })
    if(res.status !== 200){
        return res
    }else{
        let outData = res.data;
        return outData
    }
}
async function apiPutRequest(data) {
    let body = new FormData()
    body.append('name', data.info.name)
    body.append('email', data.info.email)
    body.append('password', data.info.password)
    body.append('password_confirmation', data.info.password_confirmation)
    let res = await axios.put(`https://assessment.farm21.com/api/${data.api}`, body, data.headers).catch((response)=>{
        return response.response
    })
    if(res.status !== 200){
        return res
    }else{
        let outData = res.data;
        return outData
    }
}
async function apiGetRequest(data) {
    const auth = `Bearer ${data.cookies.bearer}`
    const config = { method : 'get', 
    url : `https://assessment.farm21.com/api/${data.api}`,
    headers : {
        'Authorization' : `${auth}`
    }}
    let res = await axios(config).catch(error =>{
            return error.response
        })
    if(res.status !== 200){
    throw res.status
    }
    let outData = res.data;
    return outData
}