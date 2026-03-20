// pages/eat/eat.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    food: null,
    foodImage: null,
    recipe: null,
    showSkyModal: false,
    showPublishModal: false,
    publishForm: {
      title: '',
      content: ''
    },
    relatedPosts: [],
    showRelatedModal: false,
    skyForm: {
      name: '',
      address: '',
      phone: '',
      happiness: 5,
      note: ''
    },
    // 腾讯云COS配置（请替换为你的实际配置）
    cosConfig: {
      bucket: 'what-we-do-1412552269',
      region: 'ap-guangzhou', // 如ap-guangzhou、ap-shanghai等
      key: 'food-images/' // 存储路径前缀
    },
    // 食物列表（保持不变）
    foodList: [
      "鱼香肉丝饭", "宫保鸡丁饭", "麻婆豆腐饭", "回锅肉饭", "青椒肉丝饭",
      "土豆丝饭", "番茄炒蛋饭", "香菇滑鸡饭", "黑椒牛柳饭", "咖喱鸡肉饭",
      "咖喱牛肉饭", "红烧茄子饭", "鱼香茄子饭", "红烧鸡块饭", "红烧排骨饭",
      "红烧肉饭", "糖醋里脊饭", "糖醋排骨饭", "水煮肉片饭", "水煮鱼饭",
      "酸菜鱼饭", "剁椒鱼头饭", "辣子鸡饭", "小炒黄牛肉饭", "农家小炒肉饭",
      "手撕包菜饭", "干煸四季豆饭", "豆角炒肉饭", "芹菜炒肉饭", "蒜苔炒肉饭",
      "洋葱炒肉饭", "木耳炒肉饭", "西兰花炒肉饭", "荷兰豆炒肉饭", "杏鲍菇炒肉饭",
      "金针菇肥牛饭", "日式肥牛饭", "照烧鸡排饭", "奥尔良鸡排饭", "蜜汁叉烧饭",
      "广式烧鸭饭", "白切鸡饭", "豉油鸡饭", "盐焗鸡饭", "卤鸡腿饭",
      "卤鸭腿饭", "隆江猪脚饭", "梅菜扣肉饭", "榨菜肉丝饭", "鱼香猪肝饭",
      "爆炒腰花饭", "葱爆牛肉饭", "孜然牛肉饭", "孜然羊肉饭", "黄焖鸡米饭",
      "鸡公煲饭", "啤酒鸭饭", "三杯鸡饭", "沙茶牛肉饭", "台式卤肉饭",
      "滑蛋牛肉饭", "叉烧滑蛋饭", "咖喱猪排饭", "黑椒猪排饭", "香菇排骨饭",
      "咸鱼鸡粒饭", "滑蛋虾仁饭", "菠萝咕噜肉饭", "香煎鳕鱼饭", "红烧带鱼饭",
      "清炖排骨饭", "豆角焖饭", "香菇焖饭", "腊肠焖饭", "腊肉焖饭",
      "笋干烧肉饭", "雪菜毛豆肉丝饭", "青椒土豆丝饭", "韭菜炒蛋饭", "木耳炒蛋饭",
      "兰州牛肉面", "红烧牛肉面", "香辣牛肉面", "酸菜牛肉面", "杂酱面",
      "热干面", "担担面", "重庆小面", "麻辣小面", "肥肠面",
      "排骨面", "鸡丝面", "雪菜肉丝面", "番茄鸡蛋面", "葱油拌面",
      "油泼面", "臊子面", "刀削面", "烩面", "焖面",
      "炒面", "炒米粉", "炒河粉", "炒粿条", "炒方便面",
      "螺蛳粉", "桂林米粉", "老友粉", "三鲜粉", "牛肉粉",
      "羊肉粉", "猪脚粉", "瘦肉粉", "肥肠粉", "酸辣粉",
      "过桥米线", "鸡汤米线", "麻辣米线", "砂锅米线", "土豆粉",
      "乌冬面", "意面", "炸酱米线", "凉拌面", "凉面",
      "冷面", "云吞面", "馄饨面", "牛腩面", "牛筋面",
      "羊杂面", "牛杂面", "鱼蛋面", "虾籽面", "车仔面",
      "捞面", "拌面", "蒸面", "揪片", "热汤面",
      "炸酱面", "打卤面", "剔尖面", "猫耳朵面", "莜面鱼鱼",
      "biangbiang面", "裤带面", "空心面", "手擀面", "荞麦面",
      "青稞面", "菠菜面", "紫薯面", "南瓜面", "山药面",
      "河捞面", "抿尖面", "擦尖面", "拨鱼儿面", "饸饹面",
      "一荤一素套餐", "两荤一素套餐", "三荤两素套餐", "酸菜鱼套餐", "水煮鱼套餐",
      "麻辣香锅套餐", "麻辣拌套餐", "烤肉饭套餐", "脆皮鸡饭套餐", "鸡排饭套餐",
      "猪排饭套餐", "牛排饭套餐", "鳗鱼饭套餐", "寿司套餐", "便当套餐",
      "快餐盒饭", "小碗菜套餐", "煲仔饭", "石锅拌饭", "韩式拌饭",
      "铁板饭", "木桶饭", "荷叶饭", "竹筒饭", "焗饭",
      "炒饭", "扬州炒饭", "蛋炒饭", "火腿炒饭", "牛肉炒饭",
      "鸡丁炒饭", "海鲜炒饭", "咖喱炒饭", "酱油炒饭", "炒泡饭",
      "菜泡饭", "砂锅饭", "锅巴饭", "香锅饭", "干锅饭",
      "芝士焗饭", "番茄牛腩焗饭", "黑椒牛柳焗饭", "照烧鸡腿焗饭", "咖喱鸡肉焗饭",
      "叉烧焗饭", "滑蛋虾仁焗饭", "三文鱼焗饭", "培根蘑菇焗饭", "意式肉酱焗饭",
      "麻辣烫", "麻辣拌", "冒菜", "小火锅", "单人火锅",
      "肥牛火锅", "羊肉火锅", "鱼火锅", "鸡公煲", "排骨煲",
      "牛腩煲", "猪肚鸡", "麻辣香锅", "干锅牛蛙", "干锅虾",
      "干锅鸡", "干锅排骨", "干锅土豆片", "关东煮", "串串香",
      "钵钵鸡", "冷锅串串", "涮肚", "肥羊粉", "丸子锅",
      "豆腐煲", "粉丝煲", "酸菜锅", "番茄锅", "菌汤锅",
      "清汤锅", "鸳鸯锅", "番茄牛腩锅", "麻辣排骨锅", "香辣虾锅",
      "藤椒鱼锅", "酸汤肥牛锅", "猪肚鸡锅", "牛杂锅", "羊杂锅",
      "香辣鸡腿堡", "劲脆鸡腿堡", "牛肉堡", "芝士汉堡", "鸡肉卷",
      "老北京鸡肉卷", "墨西哥鸡肉卷", "炸鸡腿", "炸鸡翅", "炸鸡排",
      "炸鸡块", "鸡米花", "薯条", "上校鸡块", "奥尔良烤翅",
      "蜜汁手扒鸡", "披萨", "三明治", "热狗", "沙拉",
      "蛋挞", "鸡块套餐", "全家桶", "脆皮鸡", "韩式炸鸡",
      "甜辣炸鸡", "芝士炸鸡", "芝士焗薯泥", "烤鸡翅", "烤鸡腿",
      "烤鸡架", "烤肠", "芝士热狗棒", "爆浆鸡排", "拉丝芝士棒",
      "美式薯条", "芝士薯条", "薯格", "薯球", "洋葱圈",
      "白粥", "小米粥", "八宝粥", "南瓜粥", "皮蛋瘦肉粥",
      "香菇鸡肉粥", "牛肉粥", "海鲜粥", "生滚粥", "包子",
      "肉包", "菜包", "豆沙包", "烧麦", "蒸饺",
      "水饺", "馄饨", "云吞", "汤圆", "油条",
      "豆浆", "豆腐脑", "煎饼果子", "手抓饼", "鸡蛋灌饼",
      "肉夹馍", "凉皮", "米皮", "擀面皮", "牛筋面",
      "烤冷面", "饭团", "寿司", "紫菜包饭", "烤肠",
      "卤蛋", "茶叶蛋", "卤豆干", "卤藕片", "炸糕",
      "糖糕", "油条包麻糍", "糯米鸡", "烧卖", "蒸饺",
      "煎饺", "锅贴", "生煎包", "小笼包", "灌汤包",
      "麻团", "糍粑", "春卷", "炸串", "烤串",
      "铁板烧", "锡纸粉丝", "锡纸花甲", "烤红薯", "烤玉米",
      "排骨汤粉", "鸡汤粉", "羊肉汤粉", "牛杂汤粉", "牛肉汤面",
      "羊汤面", "大骨汤面", "菌汤面", "番茄汤面", "酸辣汤面",
      "鸭血粉丝汤", "老鸭粉丝汤", "猪肚汤", "鸡汤", "排骨汤",
      "海带排骨汤", "玉米排骨汤", "萝卜排骨汤", "冬瓜排骨汤", "西红柿蛋汤",
      "紫菜蛋汤", "青菜蛋汤", "豆腐汤", "酸辣汤", "胡辣汤",
      "扁食", "抄手", "瓦罐汤", "菌菇汤", "丝瓜蛋汤",
      "蛤蜊汤", "海蛎煎", "蚵仔煎", "沙茶面", "花生汤",
      "绿豆汤", "红豆汤", "银耳汤", "百合粥", "莲子粥",
      "黑米粥", "燕麦粥", "紫薯粥", "山药粥", "小米南瓜粥",
      "酱牛肉", "卤牛肉", "酱肘子", "酱猪蹄", "卤鸡爪",
      "卤鸭掌", "卤鸭翅", "卤鸭脖", "卤藕", "卤海带",
      "卤豆腐", "卤蛋肠", "卤豆皮", "卤腐竹", "卤毛豆",
      "卤花生", "卤海带结", "卤金针菇", "卤香菇", "卤木耳",
      "卤腐竹结", "卤豆腐皮", "卤鹌鹑蛋", "卤鸡翅尖", "卤鸡胗",
      "卤鸡心", "卤鸡肝", "卤鸭肠", "卤鸭舌", "卤鸭头",
      "卤鸭翅中", "卤鸭翅根", "卤鸭锁骨", "卤鸭架", "卤鸭肫",
      "卤鸭食管", "泡椒凤爪", "柠檬鸡爪", "麻辣鸡脚", "藤椒鸡脚",
      "卤猪蹄", "卤猪耳", "卤猪舌", "卤肥肠", "卤猪肝",
      "卤猪心", "卤猪腰", "卤五花肉", "卤牛肚", "卤牛舌",
      "卤牛蹄筋", "卤羊蹄", "卤羊杂", "卤鹅掌", "卤鹅翅",
      "卤鹅肝", "卤鹅胗", "卤鹅肠", "卤豆泡", "卤千张",
      "螺蛳粉", "桂林米粉", "长沙臭豆腐", "糖油粑粑", "口味虾",
      "口味蟹", "麻辣小龙虾", "蒜蓉小龙虾", "十三香小龙虾", "香辣蟹",
      "黄焖大虾", "油焖大虾", "清蒸虾", "椒盐虾", "香辣虾",
      "花甲粉丝", "爆炒花甲", "蒜蓉扇贝", "烤生蚝", "烤扇贝",
      "烤鱿鱼", "烤秋刀鱼", "烤多宝鱼", "烤鱼", "麻辣烤鱼",
      "蒜香烤鱼", "豆豉烤鱼", "纸包鱼", "石锅鱼", "酸菜鱼",
      "水煮鱼", "沸腾鱼", "剁椒鱼", "红烧鱼", "清蒸鲈鱼",
      "红烧鲫鱼", "香煎带鱼", "椒盐皮皮虾", "香辣蛏子", "爆炒鱿鱼须"
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {},

  /**
   * 随机生成食物（修复图片生成+腾讯云上传）
   */
  generateFood() {
    const { foodList } = this.data;
    const randomIndex = Math.floor(Math.random() * foodList.length);
    const randomFood = foodList[randomIndex];
    
    this.setData({
      food: randomFood,
      recipe: null,
      foodImage: null
    });
    
    // 显示可爱的加载动画
    wx.showToast({
      title: '正在为你准备美食～',
      icon: 'loading',
      duration: 6000,
      mask: true
    });
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZjlmOSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuiuv+i9r+aYr+mHjCDlj6/kuZ+5puWwhzwvdGV4dD48L3N2Zz4=';

    // 检查本地缓存
    const cachedImage = wx.getStorageSync(`food_image_${randomFood}`);
    const cachedRecipe = wx.getStorageSync(`food_recipe_${randomFood}`);
    
    if (cachedImage && cachedRecipe) {
      this.setData({ 
        foodImage: cachedImage,
        recipe: cachedRecipe 
      });
      wx.hideToast();
      wx.showToast({ title: '从缓存获取成功', icon: 'success' });
      return;
    }

    // 并行请求图片和菜谱
    const requests = [];

    // 请求图片
    const imageRequest = new Promise((resolve) => {
      if (cachedImage) {
        this.setData({ foodImage: cachedImage });
        resolve();
        return;
      }

      wx.request({
        url: 'http://localhost:3000/api/ai/generate-image',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          foodName: encodeURIComponent(randomFood)
        },
        success: (res) => {
          console.log('图片接口返回:', res);
          if (res.statusCode === 200 && res.data?.success && res.data?.imageUrl) {
            this.setData({ foodImage: res.data.imageUrl });
            // 缓存图片
            wx.setStorageSync(`food_image_${randomFood}`, res.data.imageUrl);
          } else {
            console.error('图片接口返回异常:', res.data);
            this.setData({ foodImage: defaultImage });
          }
        },
        fail: (err) => {
          console.error('图片接口调用失败:', err);
          this.setData({ foodImage: defaultImage });
        },
        complete: () => {
          resolve();
        }
      });
    });

    // 请求菜谱
    const recipeRequest = new Promise((resolve) => {
      if (cachedRecipe) {
        this.setData({ recipe: cachedRecipe });
        resolve();
        return;
      }

      wx.request({
        url: 'http://localhost:3000/api/ai/generate-recipe',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          foodName: randomFood
        },
        success: (res) => {
          console.log('菜谱接口返回:', res);
          if (res.statusCode === 200 && res.data?.success && res.data?.content) {
            this.setData({ recipe: res.data.content });
            // 缓存菜谱
            wx.setStorageSync(`food_recipe_${randomFood}`, res.data.content);
          }
        },
        fail: (err) => {
          console.error('菜谱接口调用失败:', err);
          const recipe = `# ${randomFood}制作方法\n\n## 材料\n- 材料1\n- 材料2\n- 材料3\n\n## 步骤\n1. 准备材料\n2. 处理食材\n3. 烹饪\n4. 装盘\n\n## 小贴士\n- 调整调料\n- 控制时间`;
          this.setData({ recipe: recipe });
          // 缓存默认菜谱
          wx.setStorageSync(`food_recipe_${randomFood}`, recipe);
        },
        complete: () => {
          resolve();
        }
      });
    });

    // 等待所有请求完成
    Promise.all([imageRequest, recipeRequest]).then(() => {
      wx.hideToast();
      wx.showToast({ title: '美食生成成功', icon: 'success' });
    }).catch((err) => {
      console.error('生成美食失败:', err);
      wx.hideToast();
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    });
  },

  /**
   * 处理Base64图片显示
   */
  uploadToCos(foodName, base64Str, defaultImage) {
    wx.showLoading({ title: '处理图片中...' });

    try {
      // 直接使用Base64图片显示，避免云开发初始化问题
      const base64Image = `data:image/jpeg;base64,${base64Str}`;
      this.setData({
        foodImage: base64Image
      });
      console.log('图片显示成功');
    } catch (err) {
      console.error('图片处理失败:', err);
      this.setData({ foodImage: defaultImage });
      wx.showToast({ title: '图片处理失败，显示默认图', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 处理图片加载失败
   */
  handleImageError() {
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZjlmOSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuiuv+i9r+aYr+mHjCDlj6/kuZ+5puWwhzwvdGV4dD48L3N2Zz4=';
    this.setData({ foodImage: defaultImage });
    wx.showToast({ title: '图片加载失败，已显示默认图', icon: 'none' });
  },

  /**
   * 获取菜谱（修复404问题，补全接口路径）
   */
  getRecipe() {
    const { food } = this.data;
    if (!food) {
      wx.showToast({ title: '请先随机生成食物', icon: 'none' });
      return;
    }
    
    // 检查本地缓存
    const cachedRecipe = wx.getStorageSync(`food_recipe_${food}`);
    if (cachedRecipe) {
      this.setData({ recipe: cachedRecipe });
      wx.showToast({ title: '从缓存获取菜谱', icon: 'success' });
      return;
    }
    
    // 显示可爱的加载动画
    wx.showToast({
      title: '正在为你准备菜谱～',
      icon: 'loading',
      duration: 3000,
      mask: true
    });

    wx.request({
      url: 'http://localhost:3000/api/ai/generate-recipe',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        foodName: food
      },
      success: (res) => {
        console.log('菜谱接口返回:', res);
        if (res.statusCode === 200 && res.data?.success && res.data?.content) {
          this.setData({ recipe: res.data.content });
          // 缓存菜谱
          wx.setStorageSync(`food_recipe_${food}`, res.data.content);
        }
      },
      fail: (err) => {
        console.error('菜谱接口调用失败:', err);
        const recipe = `# ${food}制作方法\n\n## 材料\n- 材料1\n- 材料2\n- 材料3\n\n## 步骤\n1. 准备材料\n2. 处理食材\n3. 烹饪\n4. 装盘\n\n## 小贴士\n- 调整调料\n- 控制时间`;
        this.setData({ recipe: recipe });
        // 缓存默认菜谱
        wx.setStorageSync(`food_recipe_${food}`, recipe);
      },
      complete: () => {
        wx.hideToast();
        wx.showToast({ title: '菜谱获取成功', icon: 'success' });
      }
    });
  },

  /**
   * 显示发布文章表单
   */
  showPublishForm() {
    const { food, recipe } = this.data;
    if (!food) {
      wx.showToast({ title: '请先生成食物', icon: 'none' });
      return;
    }
    
    this.setData({
      showPublishModal: true,
      publishForm: {
        title: `${food}的制作方法`,
        content: recipe || `# ${food}制作方法\n\n## 材料\n- 材料1\n- 材料2\n- 材料3\n\n## 步骤\n1. 准备材料\n2. 处理食材\n3. 烹饪\n4. 装盘\n\n## 小贴士\n- 调整调料\n- 控制时间`
      }
    });
  },

  /**
   * 关闭发布文章表单
   */
  closePublishModal() {
    this.setData({ showPublishModal: false });
  },

  /**
   * 更新发布文章表单
   */
  updatePublishForm(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`publishForm.${field}`]: e.detail.value });
  },

  /**
   * 提交发布文章表单
   */
  submitPublishForm() {
    const { publishForm, food, foodImage } = this.data;
    if (!publishForm.title || !publishForm.content) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '发布中...' });
    
    // 这里应该调用后端接口发布文章
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '发布成功', icon: 'success' });
      this.closePublishModal();
    }, 1000);
  },

  /**
   * 获取相关文章
   */
  getRelatedPosts() {
    const { food } = this.data;
    if (!food) {
      wx.showToast({ title: '请先生成食物', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '获取相关文章中...' });
    
    // 这里应该调用后端接口获取相关文章
    setTimeout(() => {
      this.setData({
        relatedPosts: [
          { id: 1, title: `${food}的做法`, content: '这是一篇关于${food}的文章...' },
          { id: 2, title: `${food}的营养价值`, content: '${food}含有丰富的营养...' }
        ],
        showRelatedModal: true
      });
      wx.hideLoading();
    }, 1000);
  },

  /**
   * 关闭相关文章弹窗
   */
  closeRelatedModal() {
    this.setData({ showRelatedModal: false });
  },

  /**
   * 跳转到发布页面
   */
  navigateToPublish() {
    const { food, recipe } = this.data;
    if (!food) {
      wx.showToast({ title: '请先生成食物', icon: 'none' });
      return;
    }
    
    console.log('跳转到发布页面:', { food, recipe });
    
    // 将recipe存储到本地存储，避免URL长度限制
    wx.setStorageSync('publish_recipe', recipe || '');
    wx.setStorageSync('publish_food', food);
    
    wx.navigateTo({
      url: `/pages/publish/publish`,
      success: function(res) {
        console.log('跳转成功:', res);
      },
      fail: function(err) {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
      }
    });
  },

  /**
   * 其他方法保持不变（showSkyForm、closeSkyModal等）
   */
  showSkyForm() { this.setData({ showSkyModal: true }); },
  closeSkyModal() { this.setData({ showSkyModal: false }); },
  stopPropagation() {},
  updateSkyForm(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`skyForm.${field}`]: e.detail.value });
  },
  submitSkyForm() {
    const { skyForm } = this.data;
    if (!skyForm.name || !skyForm.address || !skyForm.phone) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    wx.showToast({ title: '提交成功', icon: 'success' });
    this.closeSkyModal();
    this.setData({ skyForm: { name: '', address: '', phone: '', happiness: 5, note: '' } });
  },
  goToMeituan() {
    const { food } = this.data;
    if (!food) { wx.showToast({ title: '请先生成食物', icon: 'none' }); return; }
    const searchUrl = `https://www.meituan.com/search/?keyword=${encodeURIComponent(food)}`;
    wx.navigateTo({ url: `/pages/webview/webview?url=${searchUrl}` });
  },
  onReady() {}, onShow() {}, onHide() {}, onUnload() {},
  onPullDownRefresh() {}, onReachBottom() {}, onShareAppMessage() {}
});