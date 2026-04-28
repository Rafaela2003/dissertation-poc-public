import spacy
from flask import Flask, request, jsonify
import re
from difflib import SequenceMatcher

app = Flask(__name__)

# loads spaCy model at startup to avoid repeated loading overhead
try:
    nlp = spacy.load("en_core_web_sm")
    print("spaCy model loaded successfully")
except Exception as e:
    print(f"Failed to load spaCy model: {e}")
    exit(1)

# For identifying structured patterns like emails, phones, etc.

STRUCTURED_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
    'phone_uk': r'\b(?:(?:\+44\s?|0)7\d{3}\s?\d{3,4}\s?\d{3,4})\b',
    'postcode': r'\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b',
    'ni_number': r'\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b',
    'credit_card': r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
    'username': r'@([a-zA-Z0-9_]{3,20})',
}

# For identifying contextual clues around entities
CONTEXT_WORDS = {
    'person': ['called', 'named', 'name', 'friend', 'colleague'],
    'location': ['in', 'from', 'at', 'based', 'live', 'living'],
    'organization': ['at', 'for', 'with', 'work', 'working'],
    'job': ['as', 'work', 'working', 'role', 'doing', 'job']
}

# For identifying job-related phrases
WORK_VERBS = {
    'work', 'working', 'employed', 'doing', 'serve', 'serving',
    'role', 'position', 'job', 'career', 'profession'
}

# For identifying common industries (can be expanded)
INDUSTRIES = {
    'finance', 'healthcare', 'education', 'retail', 'technology',
    'engineering', 'marketing', 'sales', 'consulting', 'media',
    'design', 'teaching', 'accounting', 'law', 'medicine'
}

# Fuzzy matching function to allow for minor variations in detected text vs persona values

def fuzzy_match(text1, text2, threshold=0.75):
    if not text1 or not text2:
        return False
    
    text1_lower = text1.lower().strip()
    text2_lower = text2.lower().strip()
    
    if text1_lower == text2_lower:
        return True
    
    if text1_lower in text2_lower or text2_lower in text1_lower:
        return True
    
    ratio = SequenceMatcher(None, text1_lower, text2_lower).ratio()
    return ratio >= threshold

def is_persona_value(detected_value, persona_values):
    if not detected_value or not persona_values:
        return False
    
    detected_lower = detected_value.lower().strip()
    
    for allowed_value in persona_values:
        if not allowed_value:
            continue
        
        allowed_lower = str(allowed_value).lower().strip()
        
        if fuzzy_match(detected_lower, allowed_lower, threshold=0.75):
            return True
        
        if detected_lower in allowed_lower:
            return True

        if allowed_lower in detected_lower:
            return True

        detected_words = set(detected_lower.split())
        allowed_words = set(allowed_lower.split())

        # Allow subset matches
        if detected_words and detected_words.issubset(allowed_words):
            return True

        # Allow high overlap
        if len(detected_words.intersection(allowed_words)) >= max(1, len(detected_words) * 0.5):
            return True
        
        if len(detected_words.intersection(allowed_words)) >= max(1, len(detected_words) * 0.5):
            return True
    
    return False

# PII detection functions

def detect_structured_pii(text):
    detections = []
    
    for pattern_type, pattern in STRUCTURED_PATTERNS.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            matched_text = match.group(1) if match.lastindex else match.group()
            
            if pattern_type == 'username':
                matched_text = f"@{matched_text}"
            
            detections.append({
                'text': matched_text,
                'type': 'CODE',
                'subtype': pattern_type,
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.95,
                'method': 'regex'
            })
    
    return detections

def detect_spacy_entities(doc):
    detections = []
    
    for ent in doc.ents:
        entity_type = None
        
        if ent.label_ == 'PERSON':
            entity_type = 'PER'
        elif ent.label_ == 'ORG':
            entity_type = 'ORG'
        elif ent.label_ in ['GPE', 'LOC']:
            entity_type = 'LOC'
        elif ent.label_ == 'DATE' and not any(word in ent.text.lower() for word in ['year', 'old', 'age']):
            entity_type = 'DATE'
        elif ent.label_ == 'MONEY':
            entity_type = 'MONEY'
        
        if entity_type:
            detections.append({
                'text': ent.text,
                'type': entity_type,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char,
                'confidence': 0.85,
                'method': 'spacy_ner'
            })
    
    return detections

def classify_propn(token, doc):
    context_window = 3
    start_idx = max(0, token.i - context_window)
    end_idx = min(len(doc), token.i + context_window + 1)
    context_tokens = [t.text.lower() for t in doc[start_idx:end_idx]]
    
    if any(word in context_tokens for word in CONTEXT_WORDS['person']):
        return 'PER'
    
    if any(word in context_tokens for word in CONTEXT_WORDS['location']):
        return 'LOC'
    
    if any(word in context_tokens for word in CONTEXT_WORDS['organization']):
        return 'ORG'
    
    return 'PER'

def detect_propn_fallback(doc):
    detections = []
    seen_texts = set()
    
    for token in doc:
        if token.pos_ == 'PROPN' and len(token.text) > 2:
            text = token.text
            
            if text.lower() in seen_texts:
                continue
            
            full_phrase = text
            if token.i + 1 < len(doc) and doc[token.i + 1].pos_ == 'PROPN':
                phrase_tokens = [text]
                for next_token in doc[token.i + 1:]:
                    if next_token.pos_ == 'PROPN':
                        phrase_tokens.append(next_token.text)
                    else:
                        break
                full_phrase = ' '.join(phrase_tokens)
            
            entity_type = classify_propn(token, doc)
            
            if entity_type:
                detections.append({
                    'text': full_phrase,
                    'type': entity_type,
                    'label': 'PROPN',
                    'start': token.idx,
                    'end': token.idx + len(full_phrase),
                    'confidence': 0.75,
                    'method': 'pos_fallback'
                })
                seen_texts.add(full_phrase.lower())
    
    return detections

def extract_noun_phrase(token, doc):
    phrase_tokens = [token]
    
    for left_token in reversed(doc[:token.i]):
        if left_token.pos_ in ['DET', 'ADJ', 'NOUN', 'PROPN']:
            phrase_tokens.insert(0, left_token)
        else:
            break
    
    for right_token in doc[token.i + 1:]:
        if right_token.pos_ in ['NOUN', 'PROPN', 'ADJ']:
            phrase_tokens.append(right_token)
        else:
            break
    
    if phrase_tokens:
        text = ' '.join([t.text for t in phrase_tokens])
        return {
            'text': text,
            'start': phrase_tokens[0].idx,
            'end': phrase_tokens[-1].idx + len(phrase_tokens[-1].text)
        }
    
    return None

def extract_job_near_verb(verb_token, doc):
    candidates = []
    
    for child in verb_token.children:
        if child.pos_ in ['NOUN', 'PROPN'] or child.dep_ in ['attr', 'dobj', 'pobj']:
            if child.dep_ in ['attr', 'dobj', 'pobj']:
                phrase = extract_noun_phrase(child, doc)
                if phrase and len(phrase['text']) >= 3:
                    candidates.append(phrase)
    
    window = 5
    start_idx = max(0, verb_token.i - window)
    end_idx = min(len(doc), verb_token.i + window)
    
    for token in doc[start_idx:end_idx]:
        if token.pos_ in ['NOUN', 'PROPN'] and token.i != verb_token.i:
            phrase = extract_noun_phrase(token, doc)
            if phrase and len(phrase['text']) >= 3:
                if not any(word in phrase['text'].lower() for word in ['advice', 'ideas', 'help', 'things']):
                    candidates.append(phrase)
    
    return candidates

def detect_jobs_linguistic(doc):
    detections = []
    
    for token in doc:
        if token.lemma_ in WORK_VERBS or token.text.lower() in WORK_VERBS:
            job_candidates = extract_job_near_verb(token, doc)
            
            for candidate in job_candidates:
                detections.append({
                    'text': candidate['text'],
                    'type': 'JOB',
                    'label': 'JOB_TITLE',
                    'start': candidate['start'],
                    'end': candidate['end'],
                    'confidence': 0.80,
                    'method': 'linguistic_job',
                    'is_industry': candidate['text'].lower() in INDUSTRIES
                })
    
    return detections

def detect_context_window(doc):
    detections = []
    
    all_context_words = set()
    for words in CONTEXT_WORDS.values():
        all_context_words.update(words)
    
    for token in doc:
        if token.text.lower() in all_context_words:
            window = 3
            start_idx = max(0, token.i - window)
            end_idx = min(len(doc), token.i + window + 1)
            
            for nearby_token in doc[start_idx:end_idx]:
                if (nearby_token.pos_ in ['PROPN', 'NOUN'] and 
                    len(nearby_token.text) > 2 and
                    nearby_token.i != token.i):
                    
                    entity_type = None
                    if token.text.lower() in CONTEXT_WORDS['person']:
                        entity_type = 'PER'
                    elif token.text.lower() in CONTEXT_WORDS['location']:
                        entity_type = 'LOC'
                    elif token.text.lower() in CONTEXT_WORDS['organization']:
                        entity_type = 'ORG'
                    elif token.text.lower() in CONTEXT_WORDS['job']:
                        entity_type = 'JOB'
                    
                    if entity_type:
                        phrase = extract_noun_phrase(nearby_token, doc)
                        if phrase:
                            detections.append({
                                'text': phrase['text'],
                                'type': entity_type,
                                'label': 'CONTEXT',
                                'start': phrase['start'],
                                'end': phrase['end'],
                                'confidence': 0.70,
                                'method': 'context_window'
                            })
    
    return detections

# main API endpoints

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        text = data.get('text', '')
        persona = data.get('persona', None)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        print("="*60)
        print(f"Analyzing: {text}")
        print("="*60)
        
        allowed_values = extract_persona_values(persona) if persona else None
        if allowed_values:
            print(f"Persona names: {allowed_values['names'][:3]}")
            print(f"Persona jobs: {allowed_values['jobs']}")
            print(f"Persona locations: {allowed_values['locations']}")
        
        doc = nlp(text)
        
        all_detections = []
        detected_texts = set()
        
        # LAYER 1: Structured PII Detection
        print("\n[1] Structured PII Detection")
        structured = detect_structured_pii(text)
        for det in structured:
            if det['text'].lower() not in detected_texts:
                det['is_persona'] = is_persona_value(
                    det['text'], 
                    allowed_values['emails'] + allowed_values['phones']
                ) if allowed_values else False
                all_detections.append(det)
                detected_texts.add(det['text'].lower())
                print(f"  Found {det['type']}: {det['text']} (persona: {det['is_persona']})")
        
        # LAYER 2: spaCy NER
        print("\n[2] spaCy NER Detection")
        ner_entities = detect_spacy_entities(doc)
        for det in ner_entities:
            if det['text'].lower() not in detected_texts:
                det['is_persona'] = False
                if allowed_values:
                    if det['type'] == 'PER':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['names'])
                    elif det['type'] == 'LOC':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['locations'])
                    elif det['type'] == 'ORG':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['organizations'])
                
                all_detections.append(det)
                detected_texts.add(det['text'].lower())
                print(f"  Found {det['type']}: {det['text']} (persona: {det['is_persona']})")
        
        # LAYER 3: POS Fallback
        print("\n[3] POS Fallback Detection")
        propn_entities = detect_propn_fallback(doc)
        for det in propn_entities:
            if det['text'].lower() not in detected_texts:
                det['is_persona'] = False
                if allowed_values:
                    if det['type'] == 'PER':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['names'])
                    elif det['type'] == 'LOC':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['locations'])
                    elif det['type'] == 'ORG':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['organizations'])
                
                all_detections.append(det)
                detected_texts.add(det['text'].lower())
                print(f"  Found {det['type']}: {det['text']} (persona: {det['is_persona']})")
        
        # LAYER 4: Linguistic Jobs
        print("\n[4] Linguistic Job Detection")
        job_entities = detect_jobs_linguistic(doc)
        for det in job_entities:
            if det['text'].lower() not in detected_texts:
                det['is_persona'] = is_persona_value(det['text'], allowed_values['jobs']) if allowed_values else False
                all_detections.append(det)
                detected_texts.add(det['text'].lower())
                print(f"  Found JOB: {det['text']} (persona: {det['is_persona']}, industry: {det.get('is_industry', False)})")
        
        # LAYER 5: Context Window
        print("\n[5] Context Window Detection")
        context_entities = detect_context_window(doc)
        for det in context_entities:
            if det['text'].lower() not in detected_texts:
                det['is_persona'] = False
                if allowed_values:
                    if det['type'] == 'PER':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['names'])
                    elif det['type'] == 'LOC':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['locations'])
                    elif det['type'] == 'ORG':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['organizations'])
                    elif det['type'] == 'JOB':
                        det['is_persona'] = is_persona_value(det['text'], allowed_values['jobs'])
                
                all_detections.append(det)
                detected_texts.add(det['text'].lower())
                print(f"  Found {det['type']}: {det['text']} (persona: {det['is_persona']})")
        
        severity = calculate_severity(all_detections)
        
        print("="*60)
        print(f"Total detections: {len(all_detections)}")
        print(f"Severity: {severity}")
        print("="*60)
        
        result = {
            'text': text,
            'has_leakage': len(all_detections) > 0,
            'detections': all_detections,
            'severity': severity,
            'detection_count': len(all_detections)
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Helper function to extract persona values for matching

def extract_persona_values(persona):
    values = {
        'names': [],
        'jobs': [],
        'locations': [],
        'organizations': [],
        'emails': [],
        'phones': []
    }
    
    if not persona:
        return values
    
    if persona.get('PER', {}).get('full_name'):
        full_name = persona['PER']['full_name']
        values['names'].append(full_name)
        for part in full_name.split():
            if len(part) > 1:
                values['names'].append(part)
    
    if persona.get('PER', {}).get('username'):
        values['names'].append(persona['PER']['username'])
    
    if persona.get('DEM', {}).get('job_title'):
        job_title = persona['DEM']['job_title']
        values['jobs'].append(job_title)
        for part in job_title.split():
            if len(part) > 3:
                values['jobs'].append(part)
    
    if persona.get('LOC', {}).get('city'):
        values['locations'].append(persona['LOC']['city'])
    if persona.get('LOC', {}).get('country'):
        values['locations'].append(persona['LOC']['country'])
    
    if persona.get('ORG', {}).get('organisation'):
        org = persona['ORG']['organisation']
        values['organizations'].append(org)
        for part in org.split():
            if len(part) > 3:
                values['organizations'].append(part)
    
    if persona.get('CODE', {}).get('email'):
        values['emails'].append(persona['CODE']['email'])
    if persona.get('CODE', {}).get('phone'):
        values['phones'].append(persona['CODE']['phone'])
    
    return values

def calculate_severity(detections):
    if not detections:
        return 'none'
    
    external_count = sum(1 for d in detections if not d.get('is_persona', False))
    
    if external_count > 0:
        return 'critical'
    
    return 'high' if any(d['type'] in ['CODE', 'PER', 'JOB'] for d in detections) else 'medium'

if __name__ == '__main__':
    print('Starting NER-First Detection Service on port 5000...')
    print('Format-agnostic detection using spaCy + linguistic analysis')
    app.run(host='0.0.0.0', port=5000, debug=False)