package app.liryk;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String SPOTIFY_CALLBACK_SCHEME = "app.liryk";
    private static final String SPOTIFY_CALLBACK_HOST = "callback";
    private static final Uri NORMALIZED_CALLBACK_BASE_URI = Uri.parse("https://localhost/callback");

    private Intent normalizeSpotifyCallbackIntent(Intent intent) {
        if (intent == null) {
            return null;
        }

        Uri data = intent.getData();
        if (
            data == null ||
            !Intent.ACTION_VIEW.equals(intent.getAction()) ||
            !SPOTIFY_CALLBACK_SCHEME.equals(data.getScheme()) ||
            !SPOTIFY_CALLBACK_HOST.equals(data.getHost())
        ) {
            return intent;
        }

        Uri normalizedUri = NORMALIZED_CALLBACK_BASE_URI.buildUpon().encodedQuery(data.getEncodedQuery()).build();
        Intent normalizedIntent = new Intent(intent);
        normalizedIntent.setData(normalizedUri);
        return normalizedIntent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setIntent(normalizeSpotifyCallbackIntent(getIntent()));
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        Intent normalizedIntent = normalizeSpotifyCallbackIntent(intent);
        setIntent(normalizedIntent);
        super.onNewIntent(normalizedIntent);
    }
}
