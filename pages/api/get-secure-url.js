import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token and get the user
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get the content ID and field index from the request body
    const { contentId, fieldIndex } = req.body;
    
    // Fetch the content document
    const contentRef = doc(db, "adminContent", contentId);
    const contentDoc = await getDoc(contentRef);
    
    if (!contentDoc.exists()) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const contentData = contentDoc.data();
    
    // Check if the field index is valid
    if (fieldIndex < 0 || fieldIndex >= contentData.fields.length) {
      return res.status(400).json({ error: 'Invalid field index' });
    }
    
    // Get the actual URL
    const url = contentData.fields[fieldIndex];
    
    // Verify it's actually a URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Not a valid URL' });
    }
    
    // Return the URL
    return res.status(200).json({ url });
    
  } catch (error) {
    console.error('Error fetching secure URL:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}