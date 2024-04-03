var config = require("./config.json")

var robloxsecurity = ""
var csrftoken = ""

var rawvalues = {}
var rawitems = {}
var rawnames = [] // nöööö

async function discordlog(message) {
    await fetch(config.webhookurl, {
        method: "POST",
        body: JSON.stringify({content: message}),
        headers: {"Content-Type": "application/json"}
    })
}

async function getseller(item) {
    const req = await fetch(`https://economy.roblox.com/v1/assets/${item.id}/resellers`, {
        headers: {
            "Cookie": ".ROBLOSECURITY=" + robloxsecurity
        }
    })

    if (req.status == 200) {
        const json = await req.json()
        const data = json.data
        return data[0]
    } else {
        console.log("failed to get seller", await req.text())
    }
}

async function purchase_OLD(item, expectedprice) {
    const seller = await getseller(item)

    if (expectedprice <= seller.price) {
        const req = await fetch(`https://economy.roblox.com/v1/purchases/products/${item.productId}`, {
            method: "POST",
            body: JSON.stringify({
                expectedCurrency: 1,
                expectedPrice: seller.price,
                expectedSellerId: seller.seller.id,
                userAssetId: seller.userAssetId
            }),
            headers: {
                "X-Csrf-Token": csrftoken,
                "Cookie": ".ROBLOSECURITY=" + robloxsecurity
            }
        })
        const data = await req.text()
        console.log(data)
        discordlog(data)
    } else {
        console.log("price did not match expectedprice")
        discordlog("price did not match expectedprice")
    }
}

async function updatecsrf() {
    const req = await fetch("https://auth.roblox.com/v1/logout", {
        method: "POST",
        headers: {
            "Cookie": ".ROBLOSECURITY=" + config.robloxsecurity,
        }
    })

    console.log(new Date().toLocaleTimeString(), "updating csrf")
    if (req.status == 200 || req.status == 403) { 
        csrftoken = req.headers.get("X-Csrf-Token")
        robloxsecurity = config.robloxsecurity
    } else {
        console.log("failed to update csrf")
    }
}

async function updatedata() {
    const req = await fetch("https://www.rolimons.com/itemapi/itemdetails")

    console.log(new Date().toLocaleTimeString(), "updating values")
    var items = []  
    if (req.status == 200) {
        const json = await req.json()
        const data = json.items

        for (var id in data) {
            const item = data[id]

            if (item[3] >= config.values[0] && item[3] <= config.values[1] && item[5] >= config.demand[0] && item[5] <= config.demand[1]) {
                rawvalues[id] = item[3]
                items.push({
                    "id": id,
                    "itemType": "Asset"
                })
                rawnames.push(item[0])
            }
        }

        rawitems = JSON.stringify({
            items: items
        })
    } else {
        console.log("failed to update values")
    }
}

async function updatedeals() {
    const req = await fetch("https://catalog.roblox.com/v1/catalog/items/details", {
        method: "POST",
        body: rawitems,
        headers: {
            "X-Csrf-Token": csrftoken,
            "Cookie": ".ROBLOSECURITY=" + robloxsecurity
        }
    })

    console.log(new Date().toLocaleTimeString(), "updating deals")
    if (req.status == 200) {
        const json = await req.json()
        const data = json.data

        for (var i in data) {
            const rawdata = data[i]

            const price = rawdata.lowestPrice
            const value = rawvalues[rawdata.id]
            const deal = 100 - price / value * 100

            if (deal >= config.mindeal) {
                if (deal >= config.mindeal) { // juckt?
                    const seller = await getseller(rawdata)
    
                    if (price <= seller.price) {
                        const buyreq = await fetch(`https://economy.roblox.com/v1/purchases/products/${rawdata.productId}`, {
                            method: "POST",
                            body: JSON.stringify({
                                expectedCurrency: 1,
                                expectedPrice: seller.price,
                                expectedSellerId: seller.seller.id,
                                userAssetId: seller.userAssetId
                            }),
                            headers: {
                                "X-Csrf-Token": csrftoken,
                                "Cookie": ".ROBLOSECURITY=" + robloxsecurity
                            }
                        })
                        const text = await buyreq.text()
                        console.log(text)
                        await discordlog(text)
                    } else {
                        console.log("price did not match expectedprice")
                        await discordlog("price did not match expectedprice")
                    }
                }

                console.log(`${rawdata.name} ${price} (-${deal.toFixed()}%)`)
                await discordlog(`@everyone [${rawdata.name}](<https://www.roblox.com/catalog/${rawdata.id}>) ${price} (-${deal.toFixed()}%)`)
            }
        }
    } else if (req.status == 403) {
        await updatecsrf() 
    } else {
        console.log("failed to update deals")
    }
}

(async () => {
    await updatecsrf()
    await updatedata()

    discordlog(JSON.stringify(rawnames) + " **" + rawnames.length + "**")
    console.log(JSON.stringify(rawnames) + " " + rawnames.length)

    setInterval(updatecsrf, (180) * 1000)
    setInterval(updatedata, (300) * 1000)

    setInterval(updatedeals, (60 / config.cpm) * 1000)   
})()
