-- Stockstar v3 — 37 themes / ~185 stocks seed.
-- Idempotent: ON CONFLICT DO NOTHING on themes(code) and theme_stocks PK.

-- ========================================
-- A. 반도체 / AI 인프라 (8)
-- ========================================
INSERT INTO themes (code, name, category, category_name, keywords, display_order) VALUES
('A01', 'HBM/메모리', 'A', '반도체/AI 인프라', ARRAY['HBM','메모리','DRAM','HBM3','HBM4','SK하이닉스','삼성전자','한미반도체'], 1),
('A02', 'AI 가속기 PCB', 'A', '반도체/AI 인프라', ARRAY['PCB','이수페타시스','MLB','다층기판','AI가속기'], 2),
('A03', 'FC-BGA/MLCC', 'A', '반도체/AI 인프라', ARRAY['FC-BGA','MLCC','삼성전기','패키지기판'], 3),
('A04', '반도체 후공정/장비', 'A', '반도체/AI 인프라', ARRAY['후공정','패키징','한미반도체','HPSP','이오테크닉스'], 4),
('A05', '반도체 소재', 'A', '반도체/AI 인프라', ARRAY['반도체소재','솔브레인','동진쎄미켐','SK머티리얼즈'], 5),
('A06', '파운드리/시스템반도체', 'A', '반도체/AI 인프라', ARRAY['파운드리','시스템반도체','DB하이텍','텔레칩스'], 6),
('A07', '메모리 테스트/검사', 'A', '반도체/AI 인프라', ARRAY['리노공업','테스트소켓','ISC','검사장비'], 7),
('A08', '반도체 설계/IP', 'A', '반도체/AI 인프라', ARRAY['IP','설계','가온칩스','오픈엣지','칩스앤미디어'], 8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight) VALUES
((SELECT id FROM themes WHERE code='A01'), '000660', 'SK하이닉스',     true,  1),
((SELECT id FROM themes WHERE code='A01'), '005930', '삼성전자',       false, 2),
((SELECT id FROM themes WHERE code='A01'), '042700', '한미반도체',     false, 2),
((SELECT id FROM themes WHERE code='A01'), '039030', '이오테크닉스',   false, 2),
((SELECT id FROM themes WHERE code='A01'), '089030', '테크윙',         false, 2),

((SELECT id FROM themes WHERE code='A02'), '007660', '이수페타시스',   true,  1),
((SELECT id FROM themes WHERE code='A02'), '007810', '코리아써키트',   false, 2),
((SELECT id FROM themes WHERE code='A02'), '222800', '심텍',           false, 2),
((SELECT id FROM themes WHERE code='A02'), '353200', '대덕전자',       false, 2),
((SELECT id FROM themes WHERE code='A02'), '356860', '티엘비',         false, 2),

((SELECT id FROM themes WHERE code='A03'), '009150', '삼성전기',       true,  1),
((SELECT id FROM themes WHERE code='A03'), '353200', '대덕전자',       false, 2),
((SELECT id FROM themes WHERE code='A03'), '222800', '심텍',           false, 2),
((SELECT id FROM themes WHERE code='A03'), '007810', '코리아써키트',   false, 2),
((SELECT id FROM themes WHERE code='A03'), '195870', '해성디에스',     false, 2),

((SELECT id FROM themes WHERE code='A04'), '042700', '한미반도체',     true,  1),
((SELECT id FROM themes WHERE code='A04'), '403870', 'HPSP',           false, 2),
((SELECT id FROM themes WHERE code='A04'), '039030', '이오테크닉스',   false, 2),
((SELECT id FROM themes WHERE code='A04'), '031980', '피에스케이',     false, 2),
((SELECT id FROM themes WHERE code='A04'), '036810', '에프에스티',     false, 2),

((SELECT id FROM themes WHERE code='A05'), '074600', '원익QnC',        true,  1),
((SELECT id FROM themes WHERE code='A05'), '036830', '솔브레인',       false, 2),
((SELECT id FROM themes WHERE code='A05'), '005290', '동진쎄미켐',     false, 2),
((SELECT id FROM themes WHERE code='A05'), '036490', 'SK머티리얼즈',   false, 2),
((SELECT id FROM themes WHERE code='A05'), '093370', '후성',           false, 2),

((SELECT id FROM themes WHERE code='A06'), '005930', '삼성전자',       true,  1),
((SELECT id FROM themes WHERE code='A06'), '000990', 'DB하이텍',       false, 2),
((SELECT id FROM themes WHERE code='A06'), '399720', '가온칩스',       false, 2),
((SELECT id FROM themes WHERE code='A06'), '200710', '에이디테크놀로지', false, 2),
((SELECT id FROM themes WHERE code='A06'), '054450', '텔레칩스',       false, 2),

((SELECT id FROM themes WHERE code='A07'), '058470', '리노공업',       true,  1),
((SELECT id FROM themes WHERE code='A07'), '095340', 'ISC',            false, 2),
((SELECT id FROM themes WHERE code='A07'), '131290', '티에스이',       false, 2),
((SELECT id FROM themes WHERE code='A07'), '098120', '마이크로컨텍솔', false, 2),
((SELECT id FROM themes WHERE code='A07'), '097800', '윈팩',           false, 2),

((SELECT id FROM themes WHERE code='A08'), '399720', '가온칩스',       true,  1),
((SELECT id FROM themes WHERE code='A08'), '394280', '오픈엣지테크놀로지', false, 2),
((SELECT id FROM themes WHERE code='A08'), '094360', '칩스앤미디어',   false, 2),
((SELECT id FROM themes WHERE code='A08'), '054450', '텔레칩스',       false, 2),
((SELECT id FROM themes WHERE code='A08'), '200710', '에이디테크놀로지', false, 2)
ON CONFLICT (theme_id, stock_code) DO NOTHING;

-- ========================================
-- B. AI / 플랫폼 / SW / 로봇 (7)
-- ========================================
INSERT INTO themes (code, name, category, category_name, keywords, display_order) VALUES
('B01', 'AI 플랫폼/네이버', 'B', 'AI/플랫폼/SW/로봇', ARRAY['NAVER','네이버','HyperCLOVA','AI플랫폼','카카오'], 9),
('B02', 'AI 데이터센터', 'B', 'AI/플랫폼/SW/로봇', ARRAY['데이터센터','전력기기','LS','HD현대일렉트릭','효성중공업'], 10),
('B03', '휴머노이드 로봇', 'B', 'AI/플랫폼/SW/로봇', ARRAY['휴머노이드','두산로보틱스','레인보우로보틱스','옵티머스'], 11),
('B04', '산업용 로봇/자동화', 'B', 'AI/플랫폼/SW/로봇', ARRAY['산업용로봇','HD현대로보틱스','자동화','협동로봇'], 12),
('B05', '자율주행/모빌리티', 'B', 'AI/플랫폼/SW/로봇', ARRAY['자율주행','현대모비스','만도','ADAS'], 13),
('B06', '클라우드/SaaS', 'B', 'AI/플랫폼/SW/로봇', ARRAY['클라우드','SaaS','카카오','더존비즈온','케이아이엔엑스'], 14),
('B07', 'AI 의료/바이오', 'B', 'AI/플랫폼/SW/로봇', ARRAY['AI의료','루닛','뷰노','의료영상'], 15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight, note) VALUES
((SELECT id FROM themes WHERE code='B01'), '035420', 'NAVER',           true,  1, NULL),
((SELECT id FROM themes WHERE code='B01'), '035720', '카카오',          false, 2, NULL),
((SELECT id FROM themes WHERE code='B01'), '012510', '더존비즈온',      false, 2, NULL),
((SELECT id FROM themes WHERE code='B01'), '304100', '솔트룩스',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B01'), '402030', '코난테크놀로지',  false, 2, NULL),

((SELECT id FROM themes WHERE code='B02'), '010120', 'LS ELECTRIC',     true,  1, NULL),
((SELECT id FROM themes WHERE code='B02'), '267260', 'HD현대일렉트릭',  false, 2, NULL),
((SELECT id FROM themes WHERE code='B02'), '298040', '효성중공업',      false, 2, NULL),
((SELECT id FROM themes WHERE code='B02'), '000500', '가온전선',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B02'), '033100', '제룡전기',        false, 2, NULL),

((SELECT id FROM themes WHERE code='B03'), '454910', '두산로보틱스',    true,  1, NULL),
((SELECT id FROM themes WHERE code='B03'), '277810', '레인보우로보틱스', false, 2, NULL),
((SELECT id FROM themes WHERE code='B03'), '108490', '로보티즈',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B03'), '058610', '에스피지',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B03'), '348340', '뉴로메카',        false, 2, NULL),

((SELECT id FROM themes WHERE code='B04'), '267250', 'HD현대로보틱스',  true,  1, NULL),
((SELECT id FROM themes WHERE code='B04'), '018260', '삼성에스디에스',  false, 2, NULL),
((SELECT id FROM themes WHERE code='B04'), '021240', '코웨이',          false, 2, NULL),
((SELECT id FROM themes WHERE code='B04'), '056190', '에스에프에이',    false, 2, NULL),
((SELECT id FROM themes WHERE code='B04'), '090710', '휴림로봇',        false, 3, '관전용, 매매 비추 (작전성 우려)'),

((SELECT id FROM themes WHERE code='B05'), '012330', '현대모비스',      true,  1, NULL),
((SELECT id FROM themes WHERE code='B05'), '204320', 'HL만도',          false, 2, NULL),
((SELECT id FROM themes WHERE code='B05'), '118990', '모트렉스',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B05'), '089010', '켐트로닉스',      false, 2, NULL),
((SELECT id FROM themes WHERE code='B05'), '300120', '라온피플',        false, 2, NULL),

((SELECT id FROM themes WHERE code='B06'), '035720', '카카오',          true,  1, NULL),
((SELECT id FROM themes WHERE code='B06'), '012510', '더존비즈온',      false, 2, NULL),
((SELECT id FROM themes WHERE code='B06'), '093320', '케이아이엔엑스',  false, 2, NULL),
((SELECT id FROM themes WHERE code='B06'), '079940', '가비아',          false, 2, NULL),
((SELECT id FROM themes WHERE code='B06'), '060850', '영림원소프트랩',  false, 2, NULL),

((SELECT id FROM themes WHERE code='B07'), '328130', '루닛',            true,  1, NULL),
((SELECT id FROM themes WHERE code='B07'), '338220', '뷰노',            false, 2, NULL),
((SELECT id FROM themes WHERE code='B07'), '315640', '딥노이드',        false, 2, NULL),
((SELECT id FROM themes WHERE code='B07'), '384470', '코어라인소프트',  false, 2, NULL),
((SELECT id FROM themes WHERE code='B07'), '322510', '제이엘케이',      false, 2, NULL)
ON CONFLICT (theme_id, stock_code) DO NOTHING;

-- ========================================
-- C. 에너지 / 방산 / 원전 (8)
-- ========================================
INSERT INTO themes (code, name, category, category_name, keywords, display_order) VALUES
('C01', '원전 (대형)', 'C', '에너지/방산/원전', ARRAY['원전','두산에너빌리티','한전기술','한전KPS','원자력'], 16),
('C02', '원전 부품/SMR', 'C', '에너지/방산/원전', ARRAY['SMR','소형모듈원전','HD현대일렉트릭','우진엔텍'], 17),
('C03', '방산 (지상/체계)', 'C', '에너지/방산/원전', ARRAY['방산','한화에어로스페이스','현대로템','LIG넥스원','K9','K2'], 18),
('C04', '방산 (항공/우주)', 'C', '에너지/방산/원전', ARRAY['항공','우주','KAI','한국항공우주','켄코아'], 19),
('C05', '전력기기/변압기', 'C', '에너지/방산/원전', ARRAY['전력기기','변압기','HD현대일렉트릭','효성중공업','LS ELECTRIC'], 20),
('C06', '전선', 'C', '에너지/방산/원전', ARRAY['전선','LS','대한전선','가온전선','일진전기'], 21),
('C07', '풍력', 'C', '에너지/방산/원전', ARRAY['풍력','씨에스윈드','해상풍력','동국S&C'], 22),
('C08', '태양광/신재생', 'C', '에너지/방산/원전', ARRAY['태양광','신재생','한화솔루션','HD현대에너지솔루션'], 23)
ON CONFLICT (code) DO NOTHING;

INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight) VALUES
((SELECT id FROM themes WHERE code='C01'), '034020', '두산에너빌리티',  true,  1),
((SELECT id FROM themes WHERE code='C01'), '052690', '한전기술',        false, 2),
((SELECT id FROM themes WHERE code='C01'), '051600', '한전KPS',         false, 2),
((SELECT id FROM themes WHERE code='C01'), '032820', '우리기술',        false, 2),
((SELECT id FROM themes WHERE code='C01'), '083650', '비에이치아이',    false, 2),

((SELECT id FROM themes WHERE code='C02'), '267260', 'HD현대일렉트릭',  true,  1),
((SELECT id FROM themes WHERE code='C02'), '298040', '효성중공업',      false, 2),
((SELECT id FROM themes WHERE code='C02'), '457550', '우진엔텍',        false, 2),
((SELECT id FROM themes WHERE code='C02'), '006910', '보성파워텍',      false, 2),
((SELECT id FROM themes WHERE code='C02'), '094820', '일진파워',        false, 2),

((SELECT id FROM themes WHERE code='C03'), '012450', '한화에어로스페이스', true, 1),
((SELECT id FROM themes WHERE code='C03'), '064350', '현대로템',        false, 2),
((SELECT id FROM themes WHERE code='C03'), '079550', 'LIG넥스원',       false, 2),
((SELECT id FROM themes WHERE code='C03'), '272210', '한화시스템',      false, 2),
((SELECT id FROM themes WHERE code='C03'), '103140', '풍산',            false, 2),

((SELECT id FROM themes WHERE code='C04'), '047810', '한국항공우주',    true,  1),
((SELECT id FROM themes WHERE code='C04'), '012450', '한화에어로스페이스', false, 2),
((SELECT id FROM themes WHERE code='C04'), '272210', '한화시스템',      false, 2),
((SELECT id FROM themes WHERE code='C04'), '079550', 'LIG넥스원',       false, 2),
((SELECT id FROM themes WHERE code='C04'), '274090', '켄코아에어로스페이스', false, 2),

((SELECT id FROM themes WHERE code='C05'), '267260', 'HD현대일렉트릭',  true,  1),
((SELECT id FROM themes WHERE code='C05'), '298040', '효성중공업',      false, 2),
((SELECT id FROM themes WHERE code='C05'), '010120', 'LS ELECTRIC',     false, 2),
((SELECT id FROM themes WHERE code='C05'), '103590', '일진전기',        false, 2),
((SELECT id FROM themes WHERE code='C05'), '033100', '제룡전기',        false, 2),

((SELECT id FROM themes WHERE code='C06'), '006260', 'LS',              true,  1),
((SELECT id FROM themes WHERE code='C06'), '001440', '대한전선',        false, 2),
((SELECT id FROM themes WHERE code='C06'), '000500', '가온전선',        false, 2),
((SELECT id FROM themes WHERE code='C06'), '103590', '일진전기',        false, 2),
((SELECT id FROM themes WHERE code='C06'), '419540', 'LS에코에너지',    false, 2),

((SELECT id FROM themes WHERE code='C07'), '112610', '씨에스윈드',      true,  1),
((SELECT id FROM themes WHERE code='C07'), '297090', '씨에스베어링',    false, 2),
((SELECT id FROM themes WHERE code='C07'), '100130', '동국S&C',         false, 2),
((SELECT id FROM themes WHERE code='C07'), '100090', 'SK오션플랜트',    false, 2),
((SELECT id FROM themes WHERE code='C07'), '018000', '유니슨',          false, 2),

((SELECT id FROM themes WHERE code='C08'), '322000', 'HD현대에너지솔루션', true, 1),
((SELECT id FROM themes WHERE code='C08'), '009830', '한화솔루션',      false, 2),
((SELECT id FROM themes WHERE code='C08'), '475150', 'SK이터닉스',      false, 2),
((SELECT id FROM themes WHERE code='C08'), '011930', '신성이엔지',      false, 2),
((SELECT id FROM themes WHERE code='C08'), '095340', '에스에너지',      false, 2)
ON CONFLICT (theme_id, stock_code) DO NOTHING;

-- ========================================
-- D. 소재 / 산업재 / 조선 (6)
-- ========================================
INSERT INTO themes (code, name, category, category_name, keywords, display_order) VALUES
('D01', '조선', 'D', '소재/산업재/조선', ARRAY['조선','HD현대중공업','한화오션','삼성중공업','수주'], 24),
('D02', '조선 기자재', 'D', '소재/산업재/조선', ARRAY['조선기자재','HD현대마린엔진','선박엔진'], 25),
('D03', '이차전지 셀', 'D', '소재/산업재/조선', ARRAY['이차전지','LG에너지솔루션','삼성SDI','SK이노베이션'], 26),
('D04', '이차전지 양극재', 'D', '소재/산업재/조선', ARRAY['양극재','에코프로비엠','포스코퓨처엠','엘앤에프'], 27),
('D05', '핵심광물/자원', 'D', '소재/산업재/조선', ARRAY['핵심광물','포스코홀딩스','고려아연','자원'], 28),
('D06', '우크라 재건/건설', 'D', '소재/산업재/조선', ARRAY['우크라이나','재건','건설','현대건설','삼성E&A'], 29)
ON CONFLICT (code) DO NOTHING;

INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight) VALUES
((SELECT id FROM themes WHERE code='D01'), '329180', 'HD현대중공업',    true,  1),
((SELECT id FROM themes WHERE code='D01'), '042660', '한화오션',        false, 2),
((SELECT id FROM themes WHERE code='D01'), '010140', '삼성중공업',      false, 2),
((SELECT id FROM themes WHERE code='D01'), '009540', 'HD한국조선해양',  false, 2),
((SELECT id FROM themes WHERE code='D01'), '010620', 'HD현대미포',      false, 2),

((SELECT id FROM themes WHERE code='D02'), '071970', 'HD현대마린엔진',  true,  1),
((SELECT id FROM themes WHERE code='D02'), '073010', '케이에스피',      false, 2),
((SELECT id FROM themes WHERE code='D02'), '075580', '세진중공업',      false, 2),
((SELECT id FROM themes WHERE code='D02'), '017960', '한국카본',        false, 2),
((SELECT id FROM themes WHERE code='D02'), '033500', '동성화인텍',      false, 2),

((SELECT id FROM themes WHERE code='D03'), '373220', 'LG에너지솔루션',  true,  1),
((SELECT id FROM themes WHERE code='D03'), '006400', '삼성SDI',         false, 2),
((SELECT id FROM themes WHERE code='D03'), '096770', 'SK이노베이션',    false, 2),
((SELECT id FROM themes WHERE code='D03'), '005070', '코스모신소재',    false, 2),
((SELECT id FROM themes WHERE code='D03'), '336370', '솔루엠',          false, 2),

((SELECT id FROM themes WHERE code='D04'), '247540', '에코프로비엠',    true,  1),
((SELECT id FROM themes WHERE code='D04'), '003670', '포스코퓨처엠',    false, 2),
((SELECT id FROM themes WHERE code='D04'), '066970', '엘앤에프',        false, 2),
((SELECT id FROM themes WHERE code='D04'), '005070', '코스모신소재',    false, 2),
((SELECT id FROM themes WHERE code='D04'), '086520', '에코프로',        false, 2),

((SELECT id FROM themes WHERE code='D05'), '005490', '포스코홀딩스',    true,  1),
((SELECT id FROM themes WHERE code='D05'), '010130', '고려아연',        false, 2),
((SELECT id FROM themes WHERE code='D05'), '450080', '에코프로머티',    false, 2),
((SELECT id FROM themes WHERE code='D05'), '001120', 'LX인터내셔널',    false, 2),
((SELECT id FROM themes WHERE code='D05'), '000670', '영풍',            false, 2),

((SELECT id FROM themes WHERE code='D06'), '000720', '현대건설',        true,  1),
((SELECT id FROM themes WHERE code='D06'), '028050', '삼성E&A',         false, 2),
((SELECT id FROM themes WHERE code='D06'), '042670', 'HD현대인프라코어', false, 2),
((SELECT id FROM themes WHERE code='D06'), '267270', 'HD현대건설기계',  false, 2),
((SELECT id FROM themes WHERE code='D06'), '241560', '두산밥캣',        false, 2)
ON CONFLICT (theme_id, stock_code) DO NOTHING;

-- ========================================
-- E. 금융 / 바이오 / 정책 (8)
-- ========================================
INSERT INTO themes (code, name, category, category_name, keywords, display_order) VALUES
('E01', '증권/STO', 'E', '금융/바이오/정책', ARRAY['증권','STO','토큰증권','키움증권','미래에셋'], 30),
('E02', '스테이블코인/디지털자산', 'E', '금융/바이오/정책', ARRAY['스테이블코인','디지털자산','카카오페이','코인'], 31),
('E03', '바이오 대형', 'E', '금융/바이오/정책', ARRAY['바이오','삼성바이오로직스','셀트리온','SK바이오팜'], 32),
('E04', '비만치료제', 'E', '금융/바이오/정책', ARRAY['비만치료제','GLP-1','한미약품','펩트론'], 33),
('E05', '항암/신약', 'E', '금융/바이오/정책', ARRAY['항암','신약','알테오젠','HLB','리가켐바이오'], 34),
('E06', 'K-콘텐츠/엔터', 'E', '금융/바이오/정책', ARRAY['K-콘텐츠','엔터','하이브','SM','JYP','YG'], 35),
('E07', '정책 (순방국)', 'E', '금융/바이오/정책', ARRAY['순방','MOU','정책'], 36),
('E08', '부동산/리츠', 'E', '금융/바이오/정책', ARRAY['부동산','리츠','건설','현대건설','GS건설'], 37)
ON CONFLICT (code) DO NOTHING;

INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight) VALUES
((SELECT id FROM themes WHERE code='E01'), '039490', '키움증권',        true,  1),
((SELECT id FROM themes WHERE code='E01'), '006800', '미래에셋증권',    false, 2),
((SELECT id FROM themes WHERE code='E01'), '003530', '한화투자증권',    false, 2),
((SELECT id FROM themes WHERE code='E01'), '005940', 'NH투자증권',      false, 2),
((SELECT id FROM themes WHERE code='E01'), '016360', '삼성증권',        false, 2),

((SELECT id FROM themes WHERE code='E02'), '377300', '카카오페이',      true,  1),
((SELECT id FROM themes WHERE code='E02'), '094480', '갤럭시아머니트리', false, 2),
((SELECT id FROM themes WHERE code='E02'), '046440', 'KG모빌리언스',    false, 2),
((SELECT id FROM themes WHERE code='E02'), '060250', 'NHN KCP',         false, 2),
((SELECT id FROM themes WHERE code='E02'), '064260', '다날',            false, 2),

((SELECT id FROM themes WHERE code='E03'), '207940', '삼성바이오로직스', true, 1),
((SELECT id FROM themes WHERE code='E03'), '068270', '셀트리온',        false, 2),
((SELECT id FROM themes WHERE code='E03'), '196170', '알테오젠',        false, 2),
((SELECT id FROM themes WHERE code='E03'), '326030', 'SK바이오팜',      false, 2),
((SELECT id FROM themes WHERE code='E03'), '000100', '유한양행',        false, 2),

((SELECT id FROM themes WHERE code='E04'), '128940', '한미약품',        true,  1),
((SELECT id FROM themes WHERE code='E04'), '087010', '펩트론',          false, 2),
((SELECT id FROM themes WHERE code='E04'), '389470', '인벤티지랩',      false, 2),
((SELECT id FROM themes WHERE code='E04'), '347850', '디앤디파마텍',    false, 2),
((SELECT id FROM themes WHERE code='E04'), '170900', '동아에스티',      false, 2),

((SELECT id FROM themes WHERE code='E05'), '196170', '알테오젠',        true,  1),
((SELECT id FROM themes WHERE code='E05'), '141080', '리가켐바이오',    false, 2),
((SELECT id FROM themes WHERE code='E05'), '298380', '에이비엘바이오',  false, 2),
((SELECT id FROM themes WHERE code='E05'), '028300', 'HLB',             false, 2),
((SELECT id FROM themes WHERE code='E05'), '115180', '큐리언트',        false, 2),

((SELECT id FROM themes WHERE code='E06'), '352820', '하이브',          true,  1),
((SELECT id FROM themes WHERE code='E06'), '035900', 'JYP Ent.',        false, 2),
((SELECT id FROM themes WHERE code='E06'), '041510', '에스엠',          false, 2),
((SELECT id FROM themes WHERE code='E06'), '122870', '와이지엔터테인먼트', false, 2),
((SELECT id FROM themes WHERE code='E06'), '035760', 'CJ ENM',          false, 2),

((SELECT id FROM themes WHERE code='E08'), '000720', '현대건설',        true,  1),
((SELECT id FROM themes WHERE code='E08'), '375500', 'DL이앤씨',        false, 2),
((SELECT id FROM themes WHERE code='E08'), '006360', 'GS건설',          false, 2),
((SELECT id FROM themes WHERE code='E08'), '047040', '대우건설',        false, 2),
((SELECT id FROM themes WHERE code='E08'), '028050', '삼성E&A',         false, 2)
ON CONFLICT (theme_id, stock_code) DO NOTHING;

-- E07 (순방국 정책 테마) 종목은 어드민에서 동적 추가/삭제
