"use strict";

// Dependencies
const readLine = require("readline-sync")
const chalk = require("chalk").default
const ky = require("ky").default
const fs = require("fs")

// Variables
var token;

// Function
const log = (message)=>{console.log(`${chalk.gray("[+]")} ${message}`)}
const checkToken = async()=>{
    try{
        const response = await ky.get("https://api.github.com/user", {
            headers: {
                authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        }).json()
        return response
    }catch{
        return false
    }
}

const info = async()=>{
    const accountInfo = await checkToken(token)

    console.log()
    log("=== GENERAL")
    log(`Plan: ${accountInfo.plan.name.toUpperCase()}`)
    log(`Name: ${accountInfo.login}`)
    log(`Username: ${accountInfo.name}`)
    log(`BIO: ${accountInfo.bio || "N/A"}`)
    log(`Email: ${accountInfo.email || "N/A"}`)
    log(`Notification Email: ${accountInfo.notification_email || "N/A"}`)
    log(`Location: ${accountInfo.location || "N/A"}`)
    log(`Website: ${accountInfo.blog || "N/A"}`)
    log(`Company: ${accountInfo.company || "N/A"}`)
    log(`Hireable: ${accountInfo.hireable ? "Yes" : "No"}`)
    log(`Created At: ${accountInfo.created_at}`)

    log("\n=== OTHERS")
    log(`Private Repositories: ${accountInfo.total_private_repos || "N/A"}`)
    log(`Public Repositories: ${accountInfo.public_repos}`)
    log(`Public Gists: ${accountInfo.public_gists}`)
    log(`Followers: ${accountInfo.followers}`)
    log(`Following: ${accountInfo.following}`)

    log("\n=== PLAN")
    log(`Type: ${accountInfo.plan.name.toUpperCase()}`)
    log(`Max Space: ${accountInfo.plan.space}`)
    log(`Max Private Repositories: ${accountInfo.plan.private_repos}`)

    log("\n === ADDITIONAL")
    log(`2FA: ${accountInfo.two_factor_authentication ? "Yes" : "No"}`)
    console.log()
}

const repoInfo = async()=>{
    try{
        const repoURL = readLine.question(chalk.yellow(`Repository Link: `)).split("/")
        const response = await ky.get(`https://api.github.com/repos/${repoURL[3]}/${repoURL[4]}`, {
            headers: {
                authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        }).json()

        console.log()
        log("=== OWNER")
        log(`Owner: ${response.owner.login}`)
        log(`Type: ${response.owner.type}`)

        log("\n=== GENERAL")
        log(`Name: ${response.name}`)
        log(`Description: ${response.description}`)
        log(`Fork: ${response.fork ? "Yes" : "No"}`)
        log(`Stargazers: ${response.stargazers_count}`)
        log(`Watchers: ${response.watchers_count}`)
        log(`Forks: ${response.forks}`)
        log(`Open Issues: ${response.open_issues}`)
        log(`Network Count: ${response.network_count}`)
        log(`Subscribers Count: ${response.subscribers_count}`)
        log(`Topics: ${response.topics.join(", ")}`)
        log(`Default Branch: ${response.default_branch}`)
        log(`Archived: ${response.archived ? "Yes" : "No"}`)
        log(`Disabled: ${response.disabled ? "Yes" : "No"}`)

        log("\n=== LICENSE")
        log(`License Name: ${response.license.name}`)
        log(`License URL: ${response.license.url}`)

        log("\n=== ADDITIONAL")
        log(`Has Issues: ${response.has_issues ? "Yes" : "No"}`)
        log(`Has Projects: ${response.has_projects ? "Yes" : "No"}`)
        log(`Has Downloads: ${response.has_downloads ? "Yes" : "No"}`)
        log(`Has Wiki: ${response.has_wiki ? "Yes" : "No"}`)
        log(`Has Pages: ${response.has_pages ? "Yes" : "No"}`)
        log(`Has Discussions: ${response.has_discussions ? "Yes" : "No"}`)
        console.log()
    }catch{
        log("Invalid repository link.")
    }
}

const extPulls = async()=>{
    try{
        const repoURL = readLine.question(chalk.yellow(`Repository Link: `)).split("/")
        const outputFN = readLine.question(chalk.yellow(`Output Filename (ex: pulls): `)).split("/")
        if(!outputFN.length) return log("Invalid Output Filename.")
        const pulls = []
        var page = 1;

        log("Extracting the repository pulls...")
        while(true){
            const response = await ky.get(`https://api.github.com/repos/${repoURL[3]}/${repoURL[4]}/pulls?state=open&page=${page}&per_page=100`, {
                headers:{
                    authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json"
                }
            }).json()

            if(!response.length) break;
            for( const pull of response ) pulls.push(pull)
            page++
        }

        if(pulls.length){
            log(`${pulls.length} pulls extracted from the given repository.`)
            fs.writeFileSync(`${outputFN}.txt`, JSON.stringify(pulls, null, 2), "utf8")
            log(`Output has been written to ${outputFN}.txt`)
        }else{
            log("No pulls found from the given repository.")
        }
    }catch{
        log("Invalid repository link.")
    }
}

const repoFiles = async(author, repo, path = "")=>{
    try{
        const response = await ky.get(`https://api.github.com/repos/${author}/${repo}/contents/${path}?per_page=100`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            }
        }).json()
        var fileNames = []

        for ( const file of response ){
            if(file.type === "file"){
                fileNames.push(file.name)
            }else if (file.type === "dir"){
                const subDirFiles = await repoFiles(author, repo, file.path)
                fileNames = fileNames.concat(subDirFiles)
            }
        }

        return fileNames
    }catch{
        return []
    }
}

const extFilesN = async()=>{
    try{
        const repoURL = readLine.question(chalk.yellow(`Repository Link: `)).split("/")
        const outputFN = readLine.question(chalk.yellow(`Output Filename (ex: pulls): `))
        if(!outputFN.length) return log("Invalid Output Filename.")

        log("Extracting the repository files...")
        const fileNames = await repoFiles(repoURL[3], repoURL[4])

        if(fileNames.length){
            log(`${fileNames.length} files name extracted from the given repository.`)
            fs.writeFileSync(`${outputFN}.txt`, JSON.stringify(fileNames, null, 2), "utf8")
            log(`Output has been written to ${outputFN}.txt`)
        }else{
            log("No files found from the given repository.")
        }
    }catch{
        log("Invalid repository link.")
    }
}

// Main
const banner = ()=>{
    console.log(chalk.yellowBright(`

         ██████╗ ██╗████████╗██╗  ██╗██████╗  █████╗ ██╗   ██╗
        ██╔════╝ ██║╚══██╔══╝╚██╗██╔╝██╔══██╗██╔══██╗╚██╗ ██╔╝
        ██║  ███╗██║   ██║    ╚███╔╝ ██████╔╝███████║ ╚████╔╝ 
        ██║   ██║██║   ██║    ██╔██╗ ██╔══██╗██╔══██║  ╚██╔╝  
        ╚██████╔╝██║   ██║   ██╔╝ ██╗██║  ██║██║  ██║   ██║   
         ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝                                            
                            GitXray
                        by NCryptsion
    `))
}

const start = async()=>{
    banner()
    const accountToken = readLine.question(chalk.yellow(`Your Github Account Token: `))
    token = accountToken

    //* Validation
    log("Checking your token...")
    const valid = await checkToken()
    if(!valid){
        log("Invalid Github Account Token.")
        process.exit()
    }
    //* End-Validation

    console.clear()
    banner()
    navigate()
}

const navigate = async()=>{
    const command = readLine.question(chalk.yellow("gitxray: "))

    if(command === "help"){
        console.log(`
GENERAL
Command                         Description
=======                         ===========
help                            Display the help menu.
info                            Display your account information.
clear                           Clear the console.
exit                            Exit GitXray.

REPOSITORY
Command                         Description
=======                         ===========
help                            Display the help menu.
repoInfo                        Display the information of a repository.
extPulls                        Extract all the pulls of a repository.
extFilesN                       Extract all the files name of a repository.
            `)
    }else if(command === "info"){
        await info()
    }else if(command === "repoInfo"){
        await repoInfo()
    }else if(command === "extPulls"){
        await extPulls()
    }else if(command === "extFilesN"){
        await extFilesN()
    }else if(command === "clear"){
        console.clear()
    }else if(command === "exit"){
        process.exit()
    }else{
        log("Unrecognized command.")
    }

    navigate()
}

start()