export const NICKNAME_WORDS = [
    // Animals
    'Tiger', 'Lion', 'Bear', 'Eagle', 'Wolf', 'Fox', 'Cat', 'Dog', 'Panda', 'Koala',
    'Rabbit', 'Hamster', 'Turtle', 'Whale', 'Dolphin', 'Shark', 'Penguin', 'Owl', 'Hawk', 'Falcon',
    'Leopard', 'Cheetah', 'Jaguar', 'Panther', 'Lynx', 'Puma', 'Cougar', 'Ocelot', 'Serval', 'Caracal',
    'Elephant', 'Rhino', 'Hippo', 'Giraffe', 'Zebra', 'Horse', 'Donkey', 'Camel', 'Llama', 'Alpaca',
    'Deer', 'Elk', 'Moose', 'Bison', 'Buffalo', 'Cow', 'Bull', 'Sheep', 'Goat', 'Pig',
    'Chicken', 'Duck', 'Goose', 'Turkey', 'Peacock', 'Parrot', 'Flamingo', 'Swan', 'Crane', 'Stork',
    'Frog', 'Toad', 'Snake', 'Lizard', 'Gecko', 'Iguana', 'Chameleon', 'Crocodile', 'Alligator', 'Dragon',
    'Fish', 'Salmon', 'Tuna', 'Trout', 'Bass', 'Carp', 'Goldfish', 'Koi', 'Betta', 'Guppy',
    'Shark', 'Ray', 'Eel', 'Octopus', 'Squid', 'Jellyfish', 'Starfish', 'Crab', 'Lobster', 'Shrimp',
    'Ant', 'Bee', 'Wasp', 'Hornet', 'Fly', 'Mosquito', 'Butterfly', 'Moth', 'Beetle', 'Ladybug',
    'Spider', 'Scorpion', 'Centipede', 'Millipede', 'Snail', 'Slug', 'Worm', 'Leech', 'Tick', 'Mite',

    // Adjectives
    'Happy', 'Sad', 'Angry', 'Excited', 'Bored', 'Tired', 'Hungry', 'Thirsty', 'Sleepy', 'Awake',
    'Fast', 'Slow', 'Big', 'Small', 'Tall', 'Short', 'Fat', 'Thin', 'Strong', 'Weak',
    'Smart', 'Stupid', 'Funny', 'Serious', 'Kind', 'Mean', 'Nice', 'Rude', 'Polite', 'Impolite',
    'Brave', 'Cowardly', 'Honest', 'Dishonest', 'Loyal', 'Disloyal', 'Generous', 'Stingy', 'Selfish', 'Unselfish',
    'Beautiful', 'Ugly', 'Cute', 'Scary', 'Clean', 'Dirty', 'Neat', 'Messy', 'Rich', 'Poor',
    'Hot', 'Cold', 'Warm', 'Cool', 'Wet', 'Dry', 'Hard', 'Soft', 'Rough', 'Smooth',
    'Light', 'Dark', 'Bright', 'Dim', 'Loud', 'Quiet', 'High', 'Low', 'Deep', 'Shallow',
    'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown', 'Black', 'White',
    'Gold', 'Silver', 'Bronze', 'Copper', 'Iron', 'Steel', 'Stone', 'Wood', 'Glass', 'Plastic',

    // Korean Words (Transliterated or English meaning for variety if needed, but user asked for mixed)
    // Let's use actual Korean words as requested
    '호랑이', '사자', '곰', '독수리', '늑대', '여우', '고양이', '강아지', '판다', '코알라',
    '토끼', '햄스터', '거북이', '고래', '돌고래', '상어', '펭귄', '부엉이', '매', '독수리',
    '표범', '치타', '재규어', '팬더', '스라소니', '퓨마', '쿠거', '오셀롯', '서벌', '카라칼',
    '코끼리', '코뿔소', '하마', '기린', '얼룩말', '말', '당나귀', '낙타', '라마', '알파카',
    '사슴', '엘크', '무스', '바이슨', '버팔로', '소', '황소', '양', '염소', '돼지',
    '닭', '오리', '거위', '칠면조', '공작', '앵무새', '플라밍고', '백조', '학', '황새',
    '개구리', '두꺼비', '뱀', '도마뱀', '게코', '이구아나', '카멜레온', '악어', '용',
    '물고기', '연어', '참치', '송어', '배스', '잉어', '금붕어', '코이', '베타', '구피',
    '개미', '벌', '말벌', '파리', '모기', '나비', '나방', '딱정벌레', '무당벌레',
    '거미', '전갈', '지네', '노래기', '달팽이', '민달팽이', '지렁이', '거머리', '진드기',

    '행복한', '슬픈', '화난', '신난', '지루한', '피곤한', '배고픈', '목마른', '졸린', '깨어있는',
    '빠른', '느린', '큰', '작은', '키큰', '키작은', '뚱뚱한', '날씬한', '강한', '약한',
    '똑똑한', '멍청한', '웃긴', '진지한', '친절한', '못된', '착한', '무례한', '예의바른',
    '용감한', '겁쟁이', '정직한', '거짓말쟁이', '충실한', '배신자', '관대한', '인색한', '이기적인',
    '아름다운', '못생긴', '귀여운', '무서운', '깨끗한', '더러운', '깔끔한', '지저분한', '부자', '가난한',
    '뜨거운', '차가운', '따뜻한', '시원한', '젖은', '마른', '단단한', '부드러운', '거친', '매끄러운',
    '밝은', '어두운', '시끄러운', '조용한', '높은', '낮은', '깊은', '얕은',
    '빨간', '주황', '노란', '초록', '파란', '보라', '분홍', '갈색', '검은', '하얀',
    '황금', '은', '동', '구리', '철', '강철', '돌', '나무', '유리', '플라스틱',

    // Fun/Silly words
    'Ninja', 'Samurai', 'Wizard', 'Knight', 'King', 'Queen', 'Prince', 'Princess',
    'Alien', 'Robot', 'Zombie', 'Ghost', 'Vampire', 'Werewolf', 'Monster', 'Demon', 'Angel',
    'Pizza', 'Burger', 'Taco', 'Sushi', 'Noodle', 'Rice', 'Bread', 'Cheese', 'Cake', 'Cookie',
    'Coffee', 'Tea', 'Milk', 'Juice', 'Water', 'Soda', 'Beer', 'Wine',
    'Sun', 'Moon', 'Star', 'Planet', 'Comet', 'Asteroid', 'Galaxy', 'Universe',
    'Cloud', 'Rain', 'Snow', 'Wind', 'Storm', 'Thunder', 'Lightning', 'Rainbow',
    'Mountain', 'River', 'Lake', 'Ocean', 'Sea', 'Forest', 'Jungle', 'Desert', 'Island',
    'City', 'Town', 'Village', 'House', 'Building', 'School', 'Park', 'Zoo', 'Museum',
    'Car', 'Bus', 'Train', 'Plane', 'Boat', 'Ship', 'Bike', 'Rocket', 'UFO',

    '닌자', '사무라이', '마법사', '기사', '왕', '여왕', '왕자', '공주',
    '외계인', '로봇', '좀비', '유령', '뱀파이어', '늑대인간', '괴물', '악마', '천사',
    '피자', '버거', '타코', '초밥', '국수', '밥', '빵', '치즈', '케이크', '쿠키',
    '커피', '차', '우유', '주스', '물', '탄산', '맥주', '와인',
    '태양', '달', '별', '행성', '혜성', '소행성', '은하', '우주',
    '구름', '비', '눈', '바람', '폭풍', '천둥', '번개', '무지개',
    '산', '강', '호수', '바다', '숲', '정글', '사막', '섬',
    '도시', '마을', '집', '건물', '학교', '공원', '동물원', '박물관',
    '자동차', '버스', '기차', '비행기', '배', '자전거', '로켓', 'UFO'
];

export const getRandomNickname = (): string => {
    const word = NICKNAME_WORDS[Math.floor(Math.random() * NICKNAME_WORDS.length)];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${word}${number}`;
};
