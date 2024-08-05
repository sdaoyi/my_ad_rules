function log(anything) {
    console.log(anything)
  }
  
  // 代理组通用配置
  const groupBaseOption = {
    "interval": 300,
    "timeout": 3000,
    "url": "https://www.google.com/generate_204",
    "expected-status": 204,
    "lazy": true,
    "max-failed-times": 3,
    "hidden": false,
  }
  
  
  //获取原有策略组配置，除去“极速机场” 策略组
  function getOriginProxyGroups(config, removeGroupName) {
    //需要移除的订阅自带的策略组名字   对应也要修改以策略命名的路由
    const orginGroups = config['proxy-groups']
    const orginGroupsName = orginGroups.map(e => e.name)
    const pureOriginGroupsName = orginGroupsName.filter(e => !removeGroupName.includes(e))
    return orginGroups.filter(e => pureOriginGroupsName.includes(e.name))
  }
  
  //替换以策略组命名的路由 统一替换成 "速度优先"
  function replaceProxyGroupRules(rules, removeGroupName) {
    let newRules = []
    for (const r of rules) {
      const proxyNameInRule = r.replace(/,no-resolve$/, '').match(/.*,(.*)$/)[0]
      const proxyNameFilter = removeGroupName.filter(e => e === proxyNameInRule)
      if (proxyNameFilter.length > 0) {
        const newRule = r.replaceAll(proxyNameFilter[0], '速度优先')
        newRules.push(newRule)
      } else {
        newRules.push(r)
      }
      return newRules
    }
    return newRules
  }
  
  //预设国家
  const countryReg = [{ cname: /英国/, cicon: 'gb', emoji: '🇬🇧' }, { cname: /德国/, cicon: 'de', emoji: '🇩🇪' }, { cname: /阿根廷/, cicon: 'gt', emoji: '🇦🇷' },
  { cname: /美国/, cicon: 'us', emoji: '🇺🇸' }, { cname: /法国/, cicon: 'fr' }, { cname: /澳大利亚/, cicon: 'au', emoji: '🇦🇺' },
  { cname: /日本/, cicon: 'jp', emoji: '🇯🇵' }, { cname: /韩国/, cicon: 'kr', emoji: '🇰🇷' }, { "cname": /香港|hk/, "cicon": 'hk', emoji: '🇭🇰' }, { cname: /台湾/, cicon: 'tw', emoji: '🇹🇼' },
  { cname: /迪拜/, cicon: 'ae' }, { cname: /印度/, cicon: 'in' }, { cname: /巴西/, cicon: 'br' }, { cname: /新加坡|狮城/, cicon: 'sg', emoji: '🇸🇬' }]
  
  function genflag(cicon) {
    return `https://flagicons.lipis.dev/flags/4x3/${cicon}.svg`
  }
  
  //净化代理名称 
  function changeNodeName(node) {
    const tmpNode = node
    const newName = tmpNode.name.replace(/.*?([\u4e00-\u9fa5]+\s+\d+).*/, "$1")
    const countryName = newName.match(/[\u4e00-\u9fa5]+/)[0]
    const countryEmoji = countryReg.filter(function (c) {
      return c.cname.toString().includes(countryName)
    })[0]['emoji']
    tmpNode.name = countryEmoji + newName
    return tmpNode
  
  }
  function pureProxyNodes(proxy_nodes) {
    var tmpProxyNodes = proxy_nodes
    tmpProxyNodes = tmpProxyNodes.filter(p => !p.name.includes('http'))
    tmpProxyNodes = tmpProxyNodes.map(n => { return changeNodeName(n) })
    return tmpProxyNodes
  }
  
  //以国家IP来建立不同的策略组 国家名称即是策略名
  function genProxyGroups4Conutry(config) {
    const proxy_nodes = config['proxies']
    var tmpProxyGroups = []
    countryReg.forEach(function (e) {
      var proxies = []
      for (const n of proxy_nodes) {
        if (e.cname.test(n.name)) {
          proxies.push(n.name)
        }
      }
      tmpProxyGroups.push({
        ...groupBaseOption,
        name: e.cname.toString().replaceAll('/', ''),
        type: 'select',
        proxies: proxies
      })
    })
    //过滤空节点的国家策略组
    tmpProxyGroups = tmpProxyGroups.filter(e => e.proxies.length !== 0)
    return tmpProxyGroups
  }
  
  //生成自己的策略组函数（速度优先）连接到最快的节点
  function genProxyGroups4Balance(config) {
    return [{
      ...groupBaseOption,
      name: "速度优先",
      type: "url-test",
      "tolerance": 50,
      icon: "https://clash-verge-rev.github.io/assets/icons/speed.svg",
      "exclude-filter": '(?i).*x3.*',
      "include-all": true,
  
    },
    ]
  }
  //根据设定的策略组名称和正则匹配对应的节点生成策略组
  function genProxyGroupsFromReg(groupReg, proxy_nodes) {
    return {
      ...groupBaseOption,
      name: groupReg['gname'],
      type: 'url-test',
      filter: groupReg['gregex'],
      'include-all': true,
    }
  }
  
  function genProxyGroupRegCtl(groupRegs, config) {
    let tmpGroups = []
    groupRegs.forEach(function (regs) {
      const group = genProxyGroupsFromReg(regs, config['proxies'])
      tmpGroups.push(group)
    })
    return tmpGroups
  }
  //子路由通用字段
  const ruleProviderBaseOption = {
    type: "http",
    behavior: "classical",
    format: 'yaml',
    interval: 86400,
    "health-check": {
      enable: true,
      url: "http://www.gstatic.com/generate_204",
      interval: 600,
    }
  }
  
  //子路由
  const preRuleProvider = {
    spotify: {
      ...ruleProviderBaseOption,
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Spotify/Spotify.yaml",
      path: "./ruleset/blackmatrix7/Spotify.yaml"
    },
    icloud: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/icloud.txt",
      path: "./ruleset/Loyalsoldier/icloud.yaml"
    },
    steamcn: {
      ...ruleProviderBaseOption,
      url: "https://cdn.jsdelivr.net/gh/Femoon/clash-rules/steam.yaml",
      path: "./ruleset/Femoon/steam.yaml"
    },
    epiccn: {
      ...ruleProviderBaseOption,
      behavior: 'classical',
      format: 'text',
      url: 'https://raw.githubusercontent.com/Repcz/Tool/X/Clash/Rules/Epic.list',
      path: './ruleset/Repcz/epic.list'
    },
    "apple": {
      ...ruleProviderBaseOption,
      "behavior": "domain",
      format: 'yaml',
      "url": "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt",
      "path": "./ruleset/loyalsoldier/apple.yaml"
    },
    google: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      format: 'yaml',
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/google.txt",
      path: "./ruleset/Loyalsoldier/google.txt"
    },
    proxy: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt",
      path: "./ruleset/Loyalsoldier/proxy.txt"
    },
    "reject": {
      ...ruleProviderBaseOption,
      "behavior": "domain",
      "url": "https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt",
      "path": "./ruleset/loyalsoldier/reject.yaml"
    },
    direct: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt",
      path: "./ruleset/Loyalsoldier/direct.txt"
    },
    private: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt",
      path: "./ruleset/Loyalsoldier/private.txt"
    },
    gfw: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/gfw.txt",
      path: "./ruleset/Loyalsoldier/gfw.txt"
    },
    greatfire: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/greatfire.txt",
      path: "./ruleset/Loyalsoldier/greatfire.txt"
    },
    "tld-not-cn": {
      ...ruleProviderBaseOption,
      behavior: "domain",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/tld-not-cn.txt",
      path: "./ruleset/Loyalsoldier/tld-not-cn.txt"
    },
    telegramcidr: {
      ...ruleProviderBaseOption,
      behavior: "ipcidr",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/telegramcidr.txt",
      path: "./ruleset/Loyalsoldier/telegramcidr.txt"
    },
    cncidr: {
      ...ruleProviderBaseOption,
      behavior: "ipcidr",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
      path: "./ruleset/Loyalsoldier/cncidr.txt"
    },
    lancidr: {
      ...ruleProviderBaseOption,
      behavior: "ipcidr",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/lancidr.txt",
      path: "./ruleset/Loyalsoldier/lancidr.txt"
    },
    applications: {
      ...ruleProviderBaseOption,
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt",
      path: "./ruleset/Loyalsoldier/applications.txt"
    },
    "openai": {
      ...ruleProviderBaseOption,
      "url": "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/OpenAI/OpenAI.yaml",
      "path": "./ruleset/blackmatrix7/openai.yaml"
    },
    ad1: {
      ...ruleProviderBaseOption,
      behavior: "domain",
      format: "text",
      "url": "https://raw.githubusercontent.com/Repcz/Tool/X/Clash/Rules/AdGuardChinese.list",
      "path": "./ruleset/Repcz/AdGuardChinese.list"
    },
    ad2: {
      ...ruleProviderBaseOption,
      behavior: "classical",
      format: "text",
      "url": "https://raw.githubusercontent.com/Repcz/Tool/X/Clash/Rules/Ads_Dlerio.list",
      "path": "./ruleset/Repcz/Ads_Dlerio.list"
    },
    ad3: {
      ...ruleProviderBaseOption,
      behavior: "classical",
      format: "text",
      "url": "https://raw.githubusercontent.com/Repcz/Tool/X/Clash/Rules/Ads_EasyListChina.list",
      "path": "./ruleset/Repcz/Ads_EasyListChina.list"
    },
    ad4: {
      ...ruleProviderBaseOption,
      "url": "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Privacy/Privacy_Classical.yaml",
      "path": "./ruleset/blackmatrix7/Privacy_Classical.yaml"
    },
  
    'my_ad_rules': {
      ...ruleProviderBaseOption,
      "url": "https://raw.githubusercontent.com/sdaoyi/my_ad_rules/main/my_ad_rules.yaml",
      "path": "./ruleset/sdaoyi/my_ad_rules.yaml"
    }
  
  
  }
  
  //对需要特定IP的网站路由规则
  function genPreRules() {
    return [
  
      //特殊规则
      "DOMAIN-SUFFIX,jp,日本",
      "DOMAIN-SUFFIX,bing.com,美国",
      "RULE-SET,spotify,美国",
      "RULE-SET,openai,美国",
      // 广告 规则集
      "DOMAIN-SUFFIX,ads.youtube.com,REJECT",
      "RULE-SET,reject,REJECT",
      "RULE-SET,ad1,REJECT",
      "RULE-SET,ad2,REJECT",
      "RULE-SET,ad3,REJECT",
      "RULE-SET,ad4,REJECT",
     // "DOMAIN-SUFFIX,sina.com.cn,REJECT",
      // "RULE-SET,my_ad_rules,REJECT",
      //直连 规则
      "DST-PORT,22,DIRECT",
      "RULE-SET,direct,DIRECT",
      "RULE-SET,private,DIRECT",
      "RULE-SET,applications,DIRECT",
      "RULE-SET,steamcn,DIRECT",
      "RULE-SET,epiccn,DIRECT",
      "RULE-SET,icloud,速度优先",
      "RULE-SET,apple,速度优先",
      "RULE-SET,google,速度优先",
      "RULE-SET,proxy,速度优先",
      "RULE-SET,gfw,速度优先",
      "RULE-SET,tld-not-cn,速度优先",
      "RULE-SET,telegramcidr,速度优先,no-resolve",
      "RULE-SET,lancidr,DIRECT,no-resolve",
      "RULE-SET,cncidr,DIRECT,no-resolve",
      // 其他规则
      "GEOIP,LAN,DIRECT,no-resolve",
      "GEOIP,CN,DIRECT,no-resolve",
      "MATCH,速度优先"
    ]
  }
  
  
  function main(config, profileName) {
    // config['proxies']=pureProxyNodes(config['proxies'])
    var b = [{ gname: '日本', gregex: '.*(日本).*' }, { gname: '美国', gregex: '.*美国.*' }]
    const removeGroupName = ['极速机场', '闪电⚡', '故障转移', '自动选择']
    config['proxy-groups'] = [...genProxyGroups4Balance(config), ...genProxyGroupRegCtl(b, config), ...getOriginProxyGroups(config, removeGroupName)]
    config['rules'] = [...genPreRules()]
    config['rule-providers'] = preRuleProvider
    return config;
  }
  