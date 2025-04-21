import re

def sanitize_unicode(text):
    """
    Rimuove o sostituisce caratteri Unicode non validi che causerebbero errori di codifica.
    
    Args:
        text: Il testo da sanitizzare
        
    Returns:
        Testo pulito dai caratteri problematici
    """
    if not isinstance(text, str):
        return text
        
    # Rimuove i surrogati Unicode non validi
    return re.sub(r'[\uD800-\uDFFF]', '', text)

def sanitize_context_items(items):
    """
    Sanitizza tutti i campi di testo in un contesto di conversazione.
    
    Args:
        items: Lista di elementi del contesto
        
    Returns:
        Lista di elementi con testo sanitizzato
    """
    if not items:
        return items
        
    sanitized_items = []
    
    for item in items:
        if isinstance(item, dict):
            sanitized_item = {}
            for key, value in item.items():
                if key == "content" and isinstance(value, str):
                    sanitized_item[key] = sanitize_unicode(value)
                elif isinstance(value, dict):
                    sanitized_item[key] = sanitize_context_items([value])[0]
                elif isinstance(value, list):
                    sanitized_item[key] = sanitize_context_items(value)
                else:
                    sanitized_item[key] = value
            sanitized_items.append(sanitized_item)
        else:
            sanitized_items.append(item)
            
    return sanitized_items
